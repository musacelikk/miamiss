import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReturnRequest, ReturnStatus } from '../entities';
import { ShippingService } from '../shipping/shipping.service';
import { MailService } from '../mail/mail.service';
import { LogsService } from '../logs/logs.service';

/** Karar veren adminin log kaydi icin gereken asgari bilgi. */
export interface DecidingAdmin {
  id: string;
  email: string;
}

@Injectable()
export class ReturnsService {
  constructor(
    @InjectRepository(ReturnRequest) private readonly returns: Repository<ReturnRequest>,
    private readonly shipping: ShippingService,
    private readonly mail: MailService,
    private readonly logs: LogsService,
  ) {}

  private async find(id: string): Promise<ReturnRequest> {
    const request = await this.returns.findOne({ where: { id } });
    if (!request) throw new NotFoundException('İade talebi bulunamadı.');
    return request;
  }

  private assertNoShipment(request: ReturnRequest): void {
    if (request.geliverShipmentId) {
      throw new BadRequestException(
        'Bu iade talebi için zaten bir kargo var. Yeni kargo için önce mevcut olanı iptal edin.',
      );
    }
  }

  /**
   * Iade kargosunu olusturup talebe yazar. Admin panelden elle tetiklenir;
   * otomatik akista `autoCreateShipment` uzerinden cagrilir.
   */
  async createShipment(id: string): Promise<ReturnRequest> {
    const request = await this.find(id);
    this.assertNoShipment(request);
    if (request.status !== ReturnStatus.APPROVED) {
      throw new BadRequestException(
        'İade kargosu yalnızca onaylanmış talepler için oluşturulabilir.',
      );
    }
    const result = await this.shipping.createReturnShipment(request.orderId);
    request.geliverShipmentId = result.shipmentId;
    request.trackingNo = result.trackingNo;
    request.cargoCompany = result.carrier;
    request.labelUrl = result.labelUrl;
    request.shippingError = null;
    return this.returns.save(request);
  }

  /**
   * Onay akisinda cagrilir. Kargo hatasi onayi geri almasin diye hicbir
   * kosulda disari hata firlatmaz; sebebi talebe yazip loglar, admin panelden
   * duzeltip tekrar deneyebilir.
   */
  private async autoCreateShipment(request: ReturnRequest): Promise<ReturnRequest> {
    if (!this.shipping.enabled) return request;
    if (request.geliverShipmentId) return request;
    try {
      const updated = await this.createShipment(request.id);
      this.logs.record({
        userId: null,
        email: updated.email,
        actorType: 'ADMIN',
        action: 'return.shipping.autocreate',
        detail: `${updated.returnNo} — iade kargosu oluşturuldu (${updated.cargoCompany ?? '-'} / ${updated.trackingNo ?? '-'})`,
      });
      return updated;
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'bilinmeyen hata';
      try {
        await this.returns.update({ id: request.id }, { shippingError: reason });
        request.shippingError = reason;
      } catch {
        /* sebep yazilamadi; log yeterli */
      }
      this.logs.record({
        userId: null,
        email: request.email,
        actorType: 'ADMIN',
        action: 'return.shipping.autocreate.failed',
        detail: `${request.returnNo} için iade kargosu oluşturulamadı: ${reason}`,
      });
      return request;
    }
  }

  async cancelShipment(id: string): Promise<ReturnRequest> {
    const request = await this.find(id);
    if (!request.geliverShipmentId) {
      throw new BadRequestException('Bu iade talebinin kargosu yok.');
    }
    await this.shipping.cancelShipmentById(request.geliverShipmentId);
    request.geliverShipmentId = null;
    request.trackingNo = null;
    request.cargoCompany = null;
    request.labelUrl = null;
    request.shippingError = null;
    return this.returns.save(request);
  }

  /**
   * Admin karari. Onaylandiginda iade kargosu otomatik olusur ve kargo kodu
   * karar e-postasina eklenir; bu yuzden e-posta kargodan sonra gonderilir.
   */
  async decide(
    id: string,
    dto: { status: ReturnStatus; adminNote?: string },
    admin: DecidingAdmin,
  ): Promise<ReturnRequest> {
    let request = await this.find(id);
    request.status = dto.status;
    if (dto.adminNote !== undefined) request.adminNote = dto.adminNote || null;
    request = await this.returns.save(request);

    this.logs.record({
      userId: admin.id,
      email: admin.email,
      actorType: 'ADMIN',
      action: 'return.decide',
      detail: `${request.returnNo} → ${dto.status}`,
    });

    if (dto.status === ReturnStatus.APPROVED) {
      request = await this.autoCreateShipment(request);
    }

    this.mail.returnDecisionToCustomer(
      request.email,
      request.returnNo,
      request.orderNo,
      dto.status,
      request.adminNote,
      request.trackingNo ? { trackingNo: request.trackingNo, carrier: request.cargoCompany } : null,
    );
    return request;
  }
}

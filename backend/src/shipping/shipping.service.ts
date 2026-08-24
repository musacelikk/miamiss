import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../entities';
import { SettingsService } from '../settings/settings.service';
import { MailService } from '../mail/mail.service';
import { LogsService } from '../logs/logs.service';
import {
  GeliverOffer,
  GeliverService,
  GeliverShipmentInput,
  GeliverShipmentResult,
} from './geliver.service';

/** Geliver webhook govdesi: { event, data: { id, trackingNumber, trackingStatus } } */
interface GeliverWebhookPayload {
  event?: string;
  data?: {
    id?: string;
    trackingNumber?: string | null;
    trackingStatus?: { trackingStatusCode?: string } | null;
  };
}

@Injectable()
export class ShippingService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    private readonly geliver: GeliverService,
    private readonly settings: SettingsService,
    private readonly mail: MailService,
    private readonly logs: LogsService,
  ) {}

  get enabled(): boolean {
    return this.geliver.enabled;
  }

  private async shipmentInput(order: Order): Promise<GeliverShipmentInput> {
    const store = await this.settings.get();
    return {
      orderNo: order.orderNo,
      totalAmount: order.subtotal,
      recipient: {
        name: order.shippingName,
        phone: order.shippingPhone,
        email: order.email,
        city: order.shippingCity,
        district: order.shippingDistrict,
        address: order.shippingAddress,
        zip: order.shippingZip ?? '',
      },
      desi: store.defaultDesi || 1,
    };
  }

  private async findOrder(orderId: string): Promise<Order> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Sipariş bulunamadı.');
    return order;
  }

  private async applyShipment(order: Order, result: GeliverShipmentResult): Promise<Order> {
    order.geliverShipmentId = result.shipmentId;
    order.trackingNo = result.trackingNo;
    order.cargoCompany = result.carrier;
    order.labelUrl = result.labelUrl;
    return this.orders.save(order);
  }

  /**
   * Odeme onayinda cagrilir. Kargo hatasi siparisi asla etkilemesin diye
   * hicbir kosulda disari hata firlatmaz; sonucu loglar.
   */
  async autoCreateForOrder(orderId: string): Promise<void> {
    try {
      if (!this.geliver.enabled) return;
      const order = await this.orders.findOne({ where: { id: orderId } });
      if (!order || order.labelUrl || order.status === OrderStatus.CANCELLED) return;
      const draft = await this.geliver.createDraftWithOffers(await this.shipmentInput(order));
      if (!draft.cheapestOfferId) {
        throw new BadRequestException('Bu adres için kargo teklifi bulunamadı.');
      }
      const result = await this.geliver.acceptOffer(draft.cheapestOfferId);
      await this.applyShipment(order, result);
      this.logs.record({
        userId: null,
        email: order.email,
        actorType: 'ADMIN',
        action: 'shipping.autocreate',
        detail: `${order.orderNo} — Geliver gönderisi oluşturuldu (${result.carrier ?? '-'} / ${result.trackingNo ?? '-'})`,
      });
    } catch (err) {
      this.logs.record({
        userId: null,
        email: null,
        actorType: 'ADMIN',
        action: 'shipping.autocreate.failed',
        detail: `Sipariş ${orderId} için otomatik kargo oluşturulamadı: ${err instanceof Error ? err.message : 'bilinmeyen hata'}`,
      });
    }
  }

  /** Admin panel icin teklifleri getirir (gonderi taslagi olusturur). */
  async offersForOrder(orderId: string): Promise<GeliverOffer[]> {
    const order = await this.findOrder(orderId);
    if (order.labelUrl) {
      throw new BadRequestException('Bu sipariş için zaten bir gönderi var.');
    }
    const draft = await this.geliver.createDraftWithOffers(await this.shipmentInput(order));
    return draft.offers;
  }

  /** Teklif kimligi verilirse onu, verilmezse en ucuz teklifi satin alir. */
  async createForOrder(orderId: string, offerId?: string): Promise<Order> {
    const order = await this.findOrder(orderId);
    if (order.labelUrl) {
      throw new BadRequestException('Bu sipariş için zaten bir gönderi var.');
    }
    let acceptId = offerId;
    if (!acceptId) {
      const draft = await this.geliver.createDraftWithOffers(await this.shipmentInput(order));
      if (!draft.cheapestOfferId) {
        throw new BadRequestException('Bu adres için kargo teklifi bulunamadı.');
      }
      acceptId = draft.cheapestOfferId;
    }
    const result = await this.geliver.acceptOffer(acceptId);
    return this.applyShipment(order, result);
  }

  async cancelForOrder(orderId: string): Promise<Order> {
    const order = await this.findOrder(orderId);
    if (!order.geliverShipmentId) {
      throw new BadRequestException('Bu siparişin Geliver gönderisi yok.');
    }
    await this.geliver.cancelShipment(order.geliverShipmentId);
    order.geliverShipmentId = null;
    order.trackingNo = null;
    order.cargoCompany = null;
    order.labelUrl = null;
    return this.orders.save(order);
  }

  /** Geliver webhook'u (TRACK_UPDATED): gonderi durumunu siparise yansitir. */
  async handleWebhook(raw: unknown): Promise<void> {
    const payload = (raw ?? {}) as GeliverWebhookPayload;
    const shipmentId = payload.data?.id;
    const statusCode = payload.data?.trackingStatus?.trackingStatusCode;
    if (!shipmentId) return;

    const order = await this.orders.findOne({ where: { geliverShipmentId: shipmentId } });
    if (!order) return;

    // Takip no bazi firmalarda sonradan uretilir
    const trackingNo = payload.data?.trackingNumber;
    if (trackingNo && !order.trackingNo) order.trackingNo = trackingNo;

    // Durum yalnizca ileri gidebilir: gec gelen TRANSIT bildirimi
    // DELIVERED siparisi geri dusuremez, iptal edilmis siparis degismez.
    const rank: Partial<Record<OrderStatus, number>> = {
      [OrderStatus.PENDING]: 0,
      [OrderStatus.CONFIRMED]: 1,
      [OrderStatus.PREPARING]: 2,
      [OrderStatus.SHIPPED]: 3,
      [OrderStatus.DELIVERED]: 4,
    };
    const next = statusCode ? this.geliver.mapTrackingStatus(statusCode) : null;
    const currentRank = rank[order.status];
    if (next && currentRank !== undefined && (rank[next] ?? -1) > currentRank) {
      order.status = next;
      order.statusHistory = [
        ...(order.statusHistory ?? []),
        { status: next, at: new Date().toISOString() },
      ];
      if (next === OrderStatus.SHIPPED) {
        this.mail.orderShipped(order.email, order.orderNo, order.cargoCompany, order.trackingNo);
      }
    }
    await this.orders.save(order);
  }
}

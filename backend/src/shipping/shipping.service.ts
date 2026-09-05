import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderItemType, OrderStatus } from '../entities';
import { SettingsService } from '../settings/settings.service';
import { MailService } from '../mail/mail.service';
import { LogsService } from '../logs/logs.service';
import {
  CITIES,
  cityCodeFromName,
  cityNameFromCode,
  GeliverOffer,
  GeliverService,
  GeliverShipmentInput,
  GeliverShipmentItem,
  GeliverShipmentResult,
} from './geliver.service';

/** Admin panelinden kargo icin duzeltilebilen alanlar. */
export interface ShippingInfoPatch {
  shippingName?: string;
  shippingPhone?: string;
  shippingCity?: string;
  shippingDistrict?: string;
  shippingAddress?: string;
  shippingZip?: string;
  shippingDesi?: number;
}

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

  /** Admin panelindeki il secimi (Geliver'e bagli degil, her zaman doner). */
  cities(): { code: string; name: string }[] {
    return CITIES;
  }

  /**
   * Secilen ilin ilceleri. Geliver kapali veya ulasilamazsa bos liste doner;
   * panel bu durumda ilceyi serbest metin olarak almaya devam eder.
   */
  async districts(cityCode: string): Promise<string[]> {
    if (!cityCode || !cityNameFromCode(cityCode)) {
      throw new BadRequestException('Geçersiz il kodu.');
    }
    if (!this.geliver.enabled) return [];
    try {
      return await this.geliver.listDistricts(cityCode);
    } catch {
      return [];
    }
  }

  /**
   * Geliver'e istek atmadan once eksik/hatali alanlari yakalar. Boylece admin
   * "400 Bad Request" yerine neyi duzeltmesi gerektigini gorur.
   */
  private assertShippable(order: Order): void {
    const missing: string[] = [];
    if (!order.shippingName?.trim()) missing.push('alıcı adı');
    if (!order.shippingPhone?.trim()) missing.push('telefon');
    if (!order.email?.trim()) missing.push('e-posta');
    if (!order.shippingCity?.trim()) missing.push('il');
    if (!order.shippingDistrict?.trim()) missing.push('ilçe');
    if (!order.shippingAddress?.trim()) missing.push('adres');
    if (missing.length) {
      throw new BadRequestException(
        `Kargo için eksik bilgi: ${missing.join(', ')}. Teslimat bilgilerini panelden güncelleyin.`,
      );
    }
    if (!cityCodeFromName(order.shippingCity)) {
      throw new BadRequestException(
        `"${order.shippingCity}" ili tanınamadı. Teslimat bilgilerinden il adını düzeltin (örn. "İstanbul").`,
      );
    }
  }

  /**
   * Kargo etiketinde "ÜRÜNLER" bolumunde basilacak satirlar. Dijital hediye
   * kartlari fiziksel gonderiye girmez. Geliver bos kalem listesini kabul
   * etmedigi icin gonderilecek urun kalmazsa siparis numarasi tek satir olur.
   */
  private shipmentItems(order: Order): GeliverShipmentItem[] {
    const lines = (order.items ?? [])
      .filter((i) => i.itemType === OrderItemType.PRODUCT)
      .map((i) => ({
        // Etiket alani sinirli; uzun adlar kirpilir
        title: `${i.name}${i.variantName ? ` (${i.variantName})` : ''}`.trim().slice(0, 100),
        quantity: i.quantity,
      }));
    return lines.length ? lines : [{ title: `Sipariş ${order.orderNo}`, quantity: 1 }];
  }

  private async shipmentInput(order: Order): Promise<GeliverShipmentInput> {
    const store = await this.settings.get();
    return {
      orderNo: order.orderNo,
      totalAmount: order.subtotal,
      items: this.shipmentItems(order),
      recipient: {
        name: order.shippingName,
        phone: order.shippingPhone,
        email: order.email,
        city: order.shippingCity,
        district: order.shippingDistrict,
        address: order.shippingAddress,
        zip: order.shippingZip ?? '',
      },
      desi: order.shippingDesi ?? store.defaultDesi ?? 1,
    };
  }

  private async findOrder(orderId: string): Promise<Order> {
    // items: kargo etiketindeki urun satirlari icin gerekli
    const order = await this.orders.findOne({
      where: { id: orderId },
      relations: { items: true },
    });
    if (!order) throw new NotFoundException('Sipariş bulunamadı.');
    return order;
  }

  /** Ayni siparise ikinci etiket alinmasini engeller. */
  private assertNoShipment(order: Order): void {
    if (order.labelUrl || order.geliverShipmentId) {
      throw new BadRequestException(
        'Bu sipariş için zaten bir gönderi var. Yeni gönderi için önce mevcut gönderiyi iptal edin.',
      );
    }
  }

  private async applyShipment(order: Order, result: GeliverShipmentResult): Promise<Order> {
    order.geliverShipmentId = result.shipmentId;
    order.trackingNo = result.trackingNo;
    order.cargoCompany = result.carrier;
    order.labelUrl = result.labelUrl;
    order.shippingError = null;
    return this.orders.save(order);
  }

  /**
   * Teslimat bilgisi / desi duzeltmesi. Gonderi olusmadan once cagrilir;
   * kaydettikten sonra admin tekrar "gönderi oluştur" diyebilir.
   */
  async updateShippingInfo(orderId: string, patch: ShippingInfoPatch): Promise<Order> {
    const order = await this.findOrder(orderId);
    this.assertNoShipment(order);

    if (patch.shippingName !== undefined) order.shippingName = patch.shippingName.trim();
    if (patch.shippingPhone !== undefined) order.shippingPhone = patch.shippingPhone.trim();
    if (patch.shippingCity !== undefined) order.shippingCity = patch.shippingCity.trim();
    if (patch.shippingDistrict !== undefined) {
      order.shippingDistrict = patch.shippingDistrict.trim();
    }
    if (patch.shippingAddress !== undefined) order.shippingAddress = patch.shippingAddress.trim();
    if (patch.shippingZip !== undefined) order.shippingZip = patch.shippingZip.trim() || null;
    if (patch.shippingDesi !== undefined) {
      if (!(patch.shippingDesi > 0)) {
        throw new BadRequestException('Desi 0’dan büyük olmalıdır.');
      }
      order.shippingDesi = patch.shippingDesi;
    }

    this.assertShippable(order);

    // Il adini resmi yazima cevir ki sonraki eslesmeler sorunsuz olsun
    const cityCode = cityCodeFromName(order.shippingCity) as string;
    order.shippingCity = cityNameFromCode(cityCode) ?? order.shippingCity;

    // Ilceyi de simdi dogrula; gonderi anina birakmak yerine admin hemen gorsun
    if (this.geliver.enabled) {
      const resolved = await this.geliver.resolveDistrict(cityCode, order.shippingDistrict);
      if (!resolved) {
        throw new BadRequestException(
          `"${order.shippingDistrict}" ilçesi ${order.shippingCity} için tanınamadı. Listeden seçin.`,
        );
      }
      order.shippingDistrict = resolved;
    }

    order.shippingError = null;
    return this.orders.save(order);
  }

  /**
   * Odeme onayinda cagrilir. Kargo hatasi siparisi asla etkilemesin diye
   * hicbir kosulda disari hata firlatmaz; sonucu loglar.
   */
  async autoCreateForOrder(orderId: string): Promise<void> {
    if (!this.geliver.enabled) return;

    const order = await this.orders
      .findOne({ where: { id: orderId }, relations: { items: true } })
      .catch(() => null);
    if (!order) return;
    if (order.labelUrl || order.geliverShipmentId) return;
    if (order.status === OrderStatus.CANCELLED) return;

    try {
      this.assertShippable(order);
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
      const reason = err instanceof Error ? err.message : 'bilinmeyen hata';
      // Sebep siparise yazilir ki admin panelde gorup duzeltebilsin.
      // Bu kayit da basarisiz olursa siparis akisi etkilenmemeli.
      try {
        await this.orders.update({ id: order.id }, { shippingError: reason });
      } catch {
        /* sebep yazilamadi; log yeterli */
      }
      this.logs.record({
        userId: null,
        email: order.email,
        actorType: 'ADMIN',
        action: 'shipping.autocreate.failed',
        detail: `${order.orderNo} için otomatik kargo oluşturulamadı: ${reason}`,
      });
    }
  }

  /** Admin panel icin teklifleri getirir (gonderi taslagi olusturur). */
  async offersForOrder(orderId: string): Promise<GeliverOffer[]> {
    const order = await this.findOrder(orderId);
    this.assertNoShipment(order);
    this.assertShippable(order);
    const draft = await this.geliver.createDraftWithOffers(await this.shipmentInput(order));
    return draft.offers;
  }

  /** Teklif kimligi verilirse onu, verilmezse en ucuz teklifi satin alir. */
  async createForOrder(orderId: string, offerId?: string): Promise<Order> {
    const order = await this.findOrder(orderId);
    this.assertNoShipment(order);
    this.assertShippable(order);
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

  /**
   * Siparisin iade kargosunu olusturur (musteri -> magaza). Geliver adresleri
   * orijinal gonderiden ters cevirdigi icin siparisin Geliver gonderisi sart;
   * kargo elle girilmis siparislerde iade kodu da elle girilmelidir.
   */
  async createReturnShipment(orderId: string): Promise<GeliverShipmentResult> {
    const order = await this.findOrder(orderId);
    if (!order.geliverShipmentId) {
      throw new BadRequestException(
        'Bu siparişin Geliver gönderisi yok, iade kargosu otomatik oluşturulamaz. Müşteriye kargo kodunu elle iletin.',
      );
    }
    return this.geliver.createReturnShipment(order.geliverShipmentId);
  }

  /** Iade gonderisini iptal eder (siparisin kendi gonderisine dokunmaz). */
  async cancelShipmentById(shipmentId: string): Promise<void> {
    await this.geliver.cancelShipment(shipmentId);
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
    order.shippingError = null;
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

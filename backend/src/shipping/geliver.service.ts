import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '../entities';

/**
 * Il adi -> plaka kodu. Geliver alici adresinde cityCode (plaka) zorunlu;
 * siparislerde il serbest metin oldugundan normalize edip esleriz.
 */
const CITY_CODES: Record<string, string> = {
  adana: '01', adiyaman: '02', afyonkarahisar: '03', afyon: '03', agri: '04',
  amasya: '05', ankara: '06', antalya: '07', artvin: '08', aydin: '09',
  balikesir: '10', bilecik: '11', bingol: '12', bitlis: '13', bolu: '14',
  burdur: '15', bursa: '16', canakkale: '17', cankiri: '18', corum: '19',
  denizli: '20', diyarbakir: '21', edirne: '22', elazig: '23', erzincan: '24',
  erzurum: '25', eskisehir: '26', gaziantep: '27', giresun: '28', gumushane: '29',
  hakkari: '30', hatay: '31', isparta: '32', mersin: '33', icel: '33',
  istanbul: '34', izmir: '35', kars: '36', kastamonu: '37', kayseri: '38',
  kirklareli: '39', kirsehir: '40', kocaeli: '41', izmit: '41', konya: '42',
  kutahya: '43', malatya: '44', manisa: '45', kahramanmaras: '46', maras: '46',
  mardin: '47', mugla: '48', mus: '49', nevsehir: '50', nigde: '51',
  ordu: '52', rize: '53', sakarya: '54', adapazari: '54', samsun: '55',
  siirt: '56', sinop: '57', sivas: '58', tekirdag: '59', tokat: '60',
  trabzon: '61', tunceli: '62', sanliurfa: '63', urfa: '63', usak: '64',
  van: '65', yozgat: '66', zonguldak: '67', aksaray: '68', bayburt: '69',
  karaman: '70', kirikkale: '71', batman: '72', sirnak: '73', bartin: '74',
  ardahan: '75', igdir: '76', yalova: '77', karabuk: '78', kilis: '79',
  osmaniye: '80', duzce: '81',
};

/** Turkce karakterleri sadeleyip il adini plaka koduna cevirir; bulunamazsa null. */
export function cityCodeFromName(name: string): string | null {
  const normalized = name
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/i̇/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
  return CITY_CODES[normalized] ?? null;
}

/**
 * Geliver telefonu +90XXXXXXXXXX formatinda ister; siparislerde 05xx...
 * tutuldugundan burada normalize edilir (canli testte dogrulandi).
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length === 12) return `+${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `+9${digits}`;
  if (digits.length === 10) return `+90${digits}`;
  return phone.startsWith('+') ? phone : `+${digits}`;
}

export interface GeliverRecipient {
  name: string;
  phone: string;
  email: string;
  city: string;
  district: string;
  address: string;
  zip: string;
}

export interface GeliverShipmentInput {
  orderNo: string;
  /** Urun toplami (kapida odeme disinda bilgi amacli) */
  totalAmount: number;
  recipient: GeliverRecipient;
  desi: number;
}

export interface GeliverOffer {
  id: string;
  carrier: string;
  service: string;
  amount: number;
  currency: string;
  estimatedTime: string;
}

export interface GeliverDraft {
  shipmentId: string;
  cheapestOfferId: string | null;
  offers: GeliverOffer[];
}

export interface GeliverShipmentResult {
  shipmentId: string;
  trackingNo: string | null;
  carrier: string | null;
  labelUrl: string | null;
}

const BASE_URL = 'https://api.geliver.io/api/v1';

interface RawOffer {
  id: string;
  totalAmount?: string | number;
  currency?: string;
  providerCode?: string;
  providerServiceCode?: string;
  averageEstimatedTimeHumanReadible?: string;
}

@Injectable()
export class GeliverService {
  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return Boolean(this.config.get('GELIVER_API_TOKEN'));
  }

  private get testMode(): boolean {
    return this.config.get('GELIVER_TEST_MODE') !== '0';
  }

  private async request<T>(path: string, body?: unknown, method = 'POST'): Promise<T> {
    if (!this.enabled) {
      throw new ServiceUnavailableException(
        'Geliver yapılandırılmamış. GELIVER_API_TOKEN girildiğinde aktifleşir.',
      );
    }
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.config.get('GELIVER_API_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as {
      result?: boolean;
      additionalMessage?: string;
      message?: string;
      data?: T;
    };
    if (!res.ok || json.result === false) {
      throw new BadRequestException(
        json.additionalMessage ?? json.message ?? `Geliver isteği başarısız (${res.status}).`,
      );
    }
    return json.data as T;
  }

  private mapOffer(o: RawOffer): GeliverOffer {
    return {
      id: o.id,
      carrier: o.providerCode ?? '-',
      service: o.providerServiceCode ?? '-',
      amount: Number(o.totalAmount ?? 0),
      currency: o.currency ?? 'TL',
      estimatedTime: o.averageEstimatedTimeHumanReadible ?? '',
    };
  }

  /**
   * Iki asamali gonderi olusturur ve teklifleri doner. Gonderici adresi
   * bilerek gonderilmez: Geliver panelindeki varsayilan adres kullanilir.
   */
  async createDraftWithOffers(input: GeliverShipmentInput): Promise<GeliverDraft> {
    const cityCode = cityCodeFromName(input.recipient.city);
    if (!cityCode) {
      throw new BadRequestException(
        `"${input.recipient.city}" ili tanınamadı. Sipariş adresindeki il adını kontrol edin.`,
      );
    }
    const data = await this.request<{
      id: string;
      offers?: { cheapest?: RawOffer | null; list?: RawOffer[] | null } | null;
    }>('/shipments', {
      test: this.testMode,
      length: '1',
      height: '1',
      width: '1',
      distanceUnit: 'cm',
      weight: String(input.desi || 1),
      massUnit: 'kg',
      items: [{ title: `Sipariş ${input.orderNo}`, quantity: 1 }],
      recipientAddress: {
        name: input.recipient.name,
        email: input.recipient.email,
        phone: normalizePhone(input.recipient.phone),
        address1: input.recipient.address,
        countryCode: 'TR',
        cityCode,
        districtName: input.recipient.district,
        zip: input.recipient.zip || undefined,
      },
      productPaymentOnDelivery: false,
      order: {
        sourceCode: 'API',
        sourceIdentifier: 'miamisuhome.com',
        orderNumber: input.orderNo,
        totalAmount: Math.round(input.totalAmount),
        totalAmountCurrency: 'TL',
      },
    });
    return {
      shipmentId: data.id,
      cheapestOfferId: data.offers?.cheapest?.id ?? null,
      offers: (data.offers?.list ?? []).map((o) => this.mapOffer(o)),
    };
  }

  /** Teklifi kabul edip etiketi satin alir. */
  async acceptOffer(offerId: string): Promise<GeliverShipmentResult> {
    const data = await this.request<{
      shipment?: {
        id: string;
        barcode?: string | null;
        trackingNumber?: string | null;
        labelURL?: string | null;
        providerCode?: string | null;
      };
    }>('/transactions', { offerID: offerId });
    const s = data.shipment;
    if (!s) throw new BadRequestException('Geliver yanıtında gönderi bilgisi yok.');
    return {
      shipmentId: s.id,
      trackingNo: s.trackingNumber ?? s.barcode ?? null,
      carrier: s.providerCode ?? null,
      labelUrl: s.labelURL ?? null,
    };
  }

  async cancelShipment(shipmentId: string): Promise<void> {
    await this.request(`/shipments/${shipmentId}`, undefined, 'DELETE');
  }

  /**
   * Geliver trackingStatusCode -> siparis durumu.
   * PRE_TRANSIT (etiket olustu) siparis durumunu degistirmez.
   */
  mapTrackingStatus(status: string): OrderStatus | null {
    const s = status.toUpperCase();
    if (s === 'DELIVERED') return OrderStatus.DELIVERED;
    if (s === 'TRANSIT') return OrderStatus.SHIPPED;
    return null;
  }
}

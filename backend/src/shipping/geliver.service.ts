import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '../entities';

/** Plaka kodu + resmi il adi. Admin panelindeki il secimi de bu listeden beslenir. */
export const CITIES: { code: string; name: string }[] = [
  { code: '01', name: 'Adana' }, { code: '02', name: 'Adıyaman' },
  { code: '03', name: 'Afyonkarahisar' }, { code: '04', name: 'Ağrı' },
  { code: '05', name: 'Amasya' }, { code: '06', name: 'Ankara' },
  { code: '07', name: 'Antalya' }, { code: '08', name: 'Artvin' },
  { code: '09', name: 'Aydın' }, { code: '10', name: 'Balıkesir' },
  { code: '11', name: 'Bilecik' }, { code: '12', name: 'Bingöl' },
  { code: '13', name: 'Bitlis' }, { code: '14', name: 'Bolu' },
  { code: '15', name: 'Burdur' }, { code: '16', name: 'Bursa' },
  { code: '17', name: 'Çanakkale' }, { code: '18', name: 'Çankırı' },
  { code: '19', name: 'Çorum' }, { code: '20', name: 'Denizli' },
  { code: '21', name: 'Diyarbakır' }, { code: '22', name: 'Edirne' },
  { code: '23', name: 'Elazığ' }, { code: '24', name: 'Erzincan' },
  { code: '25', name: 'Erzurum' }, { code: '26', name: 'Eskişehir' },
  { code: '27', name: 'Gaziantep' }, { code: '28', name: 'Giresun' },
  { code: '29', name: 'Gümüşhane' }, { code: '30', name: 'Hakkâri' },
  { code: '31', name: 'Hatay' }, { code: '32', name: 'Isparta' },
  { code: '33', name: 'Mersin' }, { code: '34', name: 'İstanbul' },
  { code: '35', name: 'İzmir' }, { code: '36', name: 'Kars' },
  { code: '37', name: 'Kastamonu' }, { code: '38', name: 'Kayseri' },
  { code: '39', name: 'Kırklareli' }, { code: '40', name: 'Kırşehir' },
  { code: '41', name: 'Kocaeli' }, { code: '42', name: 'Konya' },
  { code: '43', name: 'Kütahya' }, { code: '44', name: 'Malatya' },
  { code: '45', name: 'Manisa' }, { code: '46', name: 'Kahramanmaraş' },
  { code: '47', name: 'Mardin' }, { code: '48', name: 'Muğla' },
  { code: '49', name: 'Muş' }, { code: '50', name: 'Nevşehir' },
  { code: '51', name: 'Niğde' }, { code: '52', name: 'Ordu' },
  { code: '53', name: 'Rize' }, { code: '54', name: 'Sakarya' },
  { code: '55', name: 'Samsun' }, { code: '56', name: 'Siirt' },
  { code: '57', name: 'Sinop' }, { code: '58', name: 'Sivas' },
  { code: '59', name: 'Tekirdağ' }, { code: '60', name: 'Tokat' },
  { code: '61', name: 'Trabzon' }, { code: '62', name: 'Tunceli' },
  { code: '63', name: 'Şanlıurfa' }, { code: '64', name: 'Uşak' },
  { code: '65', name: 'Van' }, { code: '66', name: 'Yozgat' },
  { code: '67', name: 'Zonguldak' }, { code: '68', name: 'Aksaray' },
  { code: '69', name: 'Bayburt' }, { code: '70', name: 'Karaman' },
  { code: '71', name: 'Kırıkkale' }, { code: '72', name: 'Batman' },
  { code: '73', name: 'Şırnak' }, { code: '74', name: 'Bartın' },
  { code: '75', name: 'Ardahan' }, { code: '76', name: 'Iğdır' },
  { code: '77', name: 'Yalova' }, { code: '78', name: 'Karabük' },
  { code: '79', name: 'Kilis' }, { code: '80', name: 'Osmaniye' },
  { code: '81', name: 'Düzce' },
];

/**
 * Halk arasinda kullanilan eski/kisa adlar. Anahtarlar normalize edilmis
 * haldedir; resmi adlar CITIES'ten geldigi icin burada tekrarlanmaz.
 */
const CITY_ALIASES: Record<string, string> = {
  afyon: '03', icel: '33', izmit: '41', adapazari: '54',
  antep: '27', maras: '46', kmaras: '46', urfa: '63',
};

/**
 * Il/ilce adlarini karsilastirilabilir hale getirir: buyuk-kucuk harf,
 * Turkce-Ingilizce karakter ve bosluk/noktalama farklarini siler.
 *
 * "İSTANBUL", "Istanbul", "ıstanbul" ve "istanbul" ayni degeri uretir.
 * NFD ayrimi sayesinde ş->s, ğ->g, ü->u, ö->o, ç->c, â->a kendiliginden olur;
 * "ı" ve "I" ayri harf oldugundan once elle "i"ye cevrilir.
 */
export function normalizePlaceName(name: string): string {
  return name
    .replace(/ı/g, 'i')
    .replace(/I/g, 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const CITY_CODES: Record<string, string> = {
  ...Object.fromEntries(CITIES.map((c) => [normalizePlaceName(c.name), c.code])),
  ...CITY_ALIASES,
};

/** Il adini plaka koduna cevirir; eslesmezse null. */
export function cityCodeFromName(name: string): string | null {
  return CITY_CODES[normalizePlaceName(name)] ?? null;
}

/** Plaka kodundan resmi il adi; Geliver'e adi da bu listeden gonderilir. */
export function cityNameFromCode(code: string): string | null {
  return CITIES.find((c) => c.code === code)?.name ?? null;
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
  /** Kargo etiketindeki "ÜRÜNLER" satirlari; bos gonderilemez */
  items: GeliverShipmentItem[];
}

export interface GeliverShipmentItem {
  title: string;
  quantity: number;
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

  /**
   * Ilce listesi Geliver'den gelir; il bazinda onbellege alinir cunku
   * her gonderide tekrar sorgulamak gereksiz gecikme yaratir.
   */
  private districtCache = new Map<string, string[]>();

  async listDistricts(cityCode: string): Promise<string[]> {
    const cached = this.districtCache.get(cityCode);
    if (cached) return cached;
    const data = await this.request<{ name?: string }[]>(
      `/districts?countryCode=TR&cityCode=${cityCode}`,
      undefined,
      'GET',
    );
    const names = (Array.isArray(data) ? data : [])
      .map((d) => d.name?.trim())
      .filter((n): n is string => Boolean(n));
    if (names.length) this.districtCache.set(cityCode, names);
    return names;
  }

  /**
   * Serbest metin ilceyi Geliver'in tanidigi yazima cevirir. Liste alinamazsa
   * (API/token sorunu) girilen deger oldugu gibi kullanilir — kargo akisi
   * ilce dogrulamasi yuzunden tamamen durmasin.
   */
  async resolveDistrict(cityCode: string, district: string): Promise<string | null> {
    let names: string[];
    try {
      names = await this.listDistricts(cityCode);
    } catch {
      return district.trim();
    }
    if (!names.length) return district.trim();
    const target = normalizePlaceName(district);
    return names.find((n) => normalizePlaceName(n) === target) ?? null;
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
    // Geliver ilceyi kendi yazimiyla bekliyor; serbest metni listeye esleriz
    const districtName = await this.resolveDistrict(cityCode, input.recipient.district);
    if (!districtName) {
      throw new BadRequestException(
        `"${input.recipient.district}" ilçesi ${cityNameFromCode(cityCode)} için tanınamadı. Teslimat bilgilerinden ilçeyi listeden seçin.`,
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
      items: input.items,
      recipientAddress: {
        name: input.recipient.name,
        email: input.recipient.email,
        phone: normalizePhone(input.recipient.phone),
        address1: input.recipient.address,
        countryCode: 'TR',
        cityCode,
        cityName: cityNameFromCode(cityCode) ?? undefined,
        districtName,
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

  /**
   * Iade (ters yonlu) gonderi olusturur ve etiketi ayni istekte satin alir.
   *
   * Adresleri Geliver kendisi ters cevirir: gonderici orijinal gonderinin
   * alicisi (musteri), alici ise magazanin gonderici adresi olur. Bu yuzden
   * ne alici ne gonderici adresi gonderilir — yalnizca orijinal gonderinin
   * kimligi yeterlidir. `willAccept` uygun teklifi Geliver'in kabul edip
   * etiketi satin almasini saglar, boylece tek istekte kargo kodu doner.
   */
  async createReturnShipment(originalShipmentId: string): Promise<GeliverShipmentResult> {
    const data = await this.request<{
      shipmentID?: string | null;
      shipment?: {
        id?: string | null;
        barcode?: string | null;
        trackingNumber?: string | null;
        labelURL?: string | null;
        providerCode?: string | null;
      } | null;
    }>(`/shipments/${encodeURIComponent(originalShipmentId)}`, {
      isReturn: true,
      willAccept: true,
      count: 1,
    });
    const s = data.shipment ?? {};
    // Iade gonderisinin kimligi bazi yanitlarda yalnizca ust seviyede gelir
    const shipmentId = s.id ?? data.shipmentID;
    if (!shipmentId) {
      throw new BadRequestException('Geliver iade gönderisi kimliği döndürmedi.');
    }
    return {
      shipmentId,
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

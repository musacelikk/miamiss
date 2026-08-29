import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '../entities';
import {
  CITIES,
  GeliverService,
  cityCodeFromName,
  cityNameFromCode,
  normalizePhone,
  normalizePlaceName,
} from './geliver.service';

const makeConfig = (env: Record<string, string>) =>
  ({ get: (k: string) => env[k] } as unknown as ConfigService);

const ornekInput = () => ({
  orderNo: 'MIA-1',
  totalAmount: 1250,
  recipient: {
    name: 'Ali Veli',
    phone: '05551112233',
    email: 'a@b.com',
    city: 'İstanbul',
    district: 'Kadıköy',
    address: 'Test Mah. No:1',
    zip: '34000',
  },
  desi: 2,
});

describe('normalizePlaceName', () => {
  it('buyuk-kucuk harf, TR/EN karakter ve noktalama farklarini siler', () => {
    // "i" ve "ı" ayri harf oldugu icin dort yazim da ayni degeri uretmeli
    for (const yazim of ['İSTANBUL', 'Istanbul', 'ıstanbul', 'istanbul', 'İstanbul']) {
      expect(normalizePlaceName(yazim)).toBe('istanbul');
    }
    expect(normalizePlaceName('Afyon Karahisar')).toBe('afyonkarahisar');
    expect(normalizePlaceName('K. Maraş')).toBe('kmaras');
    expect(normalizePlaceName('  Kadıköy  ')).toBe('kadikoy');
  });
});

describe('cityCodeFromName', () => {
  it('turkce karakter ve buyuk/kucuk harften bagimsiz plaka kodu doner', () => {
    expect(cityCodeFromName('İstanbul')).toBe('34');
    expect(cityCodeFromName('istanbul')).toBe('34');
    expect(cityCodeFromName('ISTANBUL')).toBe('34');
    expect(cityCodeFromName('Istanbul')).toBe('34');
    expect(cityCodeFromName('IZMIR')).toBe('35');
    expect(cityCodeFromName('Şanlıurfa')).toBe('63');
    expect(cityCodeFromName('sanliurfa')).toBe('63');
    expect(cityCodeFromName('Bilinmeyen Sehir')).toBeNull();
  });

  it('bosluklu, noktali ve kisa yazimlari da esler', () => {
    expect(cityCodeFromName('Afyon Karahisar')).toBe('03');
    expect(cityCodeFromName('afyon')).toBe('03');
    expect(cityCodeFromName('K. Maraş')).toBe('46');
    expect(cityCodeFromName('KAHRAMANMARAŞ')).toBe('46');
    expect(cityCodeFromName('Hakkâri')).toBe('30');
    expect(cityCodeFromName('hakkari')).toBe('30');
    expect(cityCodeFromName('Iğdır')).toBe('76');
    expect(cityCodeFromName('igdir')).toBe('76');
    expect(cityCodeFromName('Içel')).toBe('33');
    expect(cityCodeFromName('MERSİN')).toBe('33');
  });

  it('81 il eksiksiz ve her il kendi resmi adiyla eslesiyor', () => {
    expect(CITIES).toHaveLength(81);
    for (const city of CITIES) {
      expect(cityCodeFromName(city.name)).toBe(city.code);
      expect(cityNameFromCode(city.code)).toBe(city.name);
    }
  });
});

describe('normalizePhone', () => {
  it('yerel formati Geliverin bekledigi +90 formatina cevirir', () => {
    expect(normalizePhone('05551112233')).toBe('+905551112233');
    expect(normalizePhone('0555 111 22 33')).toBe('+905551112233');
    expect(normalizePhone('5551112233')).toBe('+905551112233');
    expect(normalizePhone('905551112233')).toBe('+905551112233');
    expect(normalizePhone('+905551112233')).toBe('+905551112233');
  });
});

describe('GeliverService', () => {
  it('token yoksa enabled=false, cagrilar hata firlatir', async () => {
    const svc = new GeliverService(makeConfig({}));
    expect(svc.enabled).toBe(false);
    await expect(svc.createDraftWithOffers(ornekInput())).rejects.toThrow(
      'Geliver yapılandırılmamış',
    );
  });

  /** Ilce listesi ve gonderi olusturma ayri uclara gittigi icin URL'e gore yanit verir. */
  const makeFetchMock = (districts: { name: string }[] | null = [{ name: 'Kadıköy' }]) =>
    jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('/districts')) {
        return Promise.resolve({
          ok: districts !== null,
          status: districts === null ? 500 : 200,
          json: () => Promise.resolve({ result: districts !== null, data: districts }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            result: true,
            data: {
              id: 'shp1',
              offers: {
                cheapest: { id: 'of1' },
                list: [
                  {
                    id: 'of1',
                    totalAmount: '89.90',
                    currency: 'TL',
                    providerCode: 'YURTICI',
                    providerServiceCode: 'YURTICI_STD',
                    averageEstimatedTimeHumanReadible: '01 gün',
                  },
                ],
              },
            },
          }),
      });
    });

  it('gonderi olusturma bearer token ve alici bilgisiyle gider, teklifler donulur', async () => {
    const svc = new GeliverService(makeConfig({ GELIVER_API_TOKEN: 'tok123', GELIVER_TEST_MODE: '1' }));
    const fetchMock = makeFetchMock();
    global.fetch = fetchMock as unknown as typeof fetch;

    const draft = await svc.createDraftWithOffers(ornekInput());
    expect(draft.shipmentId).toBe('shp1');
    expect(draft.cheapestOfferId).toBe('of1');
    expect(draft.offers[0]).toEqual({
      id: 'of1',
      carrier: 'YURTICI',
      service: 'YURTICI_STD',
      amount: 89.9,
      currency: 'TL',
      estimatedTime: '01 gün',
    });

    const shipmentCall = fetchMock.mock.calls.find((c) => String(c[0]).endsWith('/shipments'));
    expect(shipmentCall).toBeDefined();
    const [url, init] = shipmentCall as [string, { headers: Record<string, string>; body: string }];
    expect(String(url)).toBe('https://api.geliver.io/api/v1/shipments');
    expect(init.headers.Authorization).toBe('Bearer tok123');
    const body = JSON.parse(String(init.body));
    expect(body.test).toBe(true);
    expect(body.recipientAddress.name).toBe('Ali Veli');
    expect(body.recipientAddress.phone).toBe('+905551112233');
    expect(body.recipientAddress.cityCode).toBe('34');
    expect(body.recipientAddress.cityName).toBe('İstanbul');
    expect(body.recipientAddress.districtName).toBe('Kadıköy');
    expect(body.order.orderNumber).toBe('MIA-1');
  });

  it('serbest metin ilce Geliverin yazimina cevrilerek gonderilir', async () => {
    const svc = new GeliverService(makeConfig({ GELIVER_API_TOKEN: 'tok123' }));
    const fetchMock = makeFetchMock([{ name: 'Kadıköy' }, { name: 'Beşiktaş' }]);
    global.fetch = fetchMock as unknown as typeof fetch;

    const input = ornekInput();
    input.recipient.district = 'BESIKTAS';
    await svc.createDraftWithOffers(input);

    const shipmentCall = fetchMock.mock.calls.find((c) => String(c[0]).endsWith('/shipments'));
    const body = JSON.parse(String((shipmentCall as [string, { body: string }])[1].body));
    expect(body.recipientAddress.districtName).toBe('Beşiktaş');
  });

  it('listede olmayan ilce icin anlasilir hata verir', async () => {
    const svc = new GeliverService(makeConfig({ GELIVER_API_TOKEN: 'tok123' }));
    global.fetch = makeFetchMock([{ name: 'Kadıköy' }]) as unknown as typeof fetch;

    const input = ornekInput();
    input.recipient.district = 'Olmayan Ilce';
    await expect(svc.createDraftWithOffers(input)).rejects.toThrow(
      '"Olmayan Ilce" ilçesi İstanbul için tanınamadı',
    );
  });

  it('ilce listesi alinamazsa girilen ilce ile devam edilir', async () => {
    const svc = new GeliverService(makeConfig({ GELIVER_API_TOKEN: 'tok123' }));
    const fetchMock = makeFetchMock(null);
    global.fetch = fetchMock as unknown as typeof fetch;

    const input = ornekInput();
    input.recipient.district = 'Kadikoy';
    await svc.createDraftWithOffers(input);

    const shipmentCall = fetchMock.mock.calls.find((c) => String(c[0]).endsWith('/shipments'));
    const body = JSON.parse(String((shipmentCall as [string, { body: string }])[1].body));
    expect(body.recipientAddress.districtName).toBe('Kadikoy');
  });

  it('ilce listesi il bazinda onbellege alinir', async () => {
    const svc = new GeliverService(makeConfig({ GELIVER_API_TOKEN: 'tok123' }));
    const fetchMock = makeFetchMock();
    global.fetch = fetchMock as unknown as typeof fetch;

    await svc.listDistricts('34');
    await svc.listDistricts('34');
    const districtCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes('/districts'));
    expect(districtCalls).toHaveLength(1);
    expect(String(districtCalls[0][0])).toBe(
      'https://api.geliver.io/api/v1/districts?countryCode=TR&cityCode=34',
    );
    expect(districtCalls[0][1].method).toBe('GET');
  });

  it('teklif kabulu transactions ucuna gider ve etiket bilgilerini doner', async () => {
    const svc = new GeliverService(makeConfig({ GELIVER_API_TOKEN: 'tok123' }));
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          result: true,
          data: {
            id: 'trx1',
            shipment: {
              id: 'shp1',
              barcode: 'BR123',
              trackingNumber: 'TRK123',
              trackingUrl: 'http://takip',
              labelURL: 'http://label.pdf',
              providerCode: 'YURTICI',
            },
          },
        }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await svc.acceptOffer('of1');
    expect(res).toEqual({
      shipmentId: 'shp1',
      trackingNo: 'TRK123',
      carrier: 'YURTICI',
      labelUrl: 'http://label.pdf',
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://api.geliver.io/api/v1/transactions');
    expect(JSON.parse(String(init.body)).offerID).toBe('of1');
  });

  it('takip no yoksa barkod takip numarasi olarak kullanilir', async () => {
    const svc = new GeliverService(makeConfig({ GELIVER_API_TOKEN: 'tok123' }));
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          result: true,
          data: { shipment: { id: 'shp1', barcode: 'BR123', labelURL: null, providerCode: 'MNG' } },
        }),
    }) as unknown as typeof fetch;
    const res = await svc.acceptOffer('of1');
    expect(res.trackingNo).toBe('BR123');
  });

  it('iptal DELETE /shipments/{id} olarak gider', async () => {
    const svc = new GeliverService(makeConfig({ GELIVER_API_TOKEN: 'tok123' }));
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: true, data: {} }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    await svc.cancelShipment('shp1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://api.geliver.io/api/v1/shipments/shp1');
    expect(init.method).toBe('DELETE');
  });

  it('API hata donerse mesaj BadRequest olarak yukselir', async () => {
    const svc = new GeliverService(makeConfig({ GELIVER_API_TOKEN: 'tok123' }));
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ result: false, additionalMessage: 'Adres eksik' }),
    }) as unknown as typeof fetch;
    await expect(svc.acceptOffer('of1')).rejects.toThrow('Adres eksik');
  });

  it('takip durumlarini siparis durumuna esler', () => {
    const svc = new GeliverService(makeConfig({ GELIVER_API_TOKEN: 't' }));
    expect(svc.mapTrackingStatus('DELIVERED')).toBe(OrderStatus.DELIVERED);
    expect(svc.mapTrackingStatus('delivered')).toBe(OrderStatus.DELIVERED);
    expect(svc.mapTrackingStatus('TRANSIT')).toBe(OrderStatus.SHIPPED);
    expect(svc.mapTrackingStatus('PRE_TRANSIT')).toBeNull();
    expect(svc.mapTrackingStatus('FAILURE')).toBeNull();
    expect(svc.mapTrackingStatus('bilinmeyen')).toBeNull();
  });
});

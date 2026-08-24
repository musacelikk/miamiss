import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '../entities';
import { GeliverService, cityCodeFromName } from './geliver.service';

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

describe('cityCodeFromName', () => {
  it('turkce karakter ve buyuk/kucuk harften bagimsiz plaka kodu doner', () => {
    expect(cityCodeFromName('İstanbul')).toBe('34');
    expect(cityCodeFromName('istanbul')).toBe('34');
    expect(cityCodeFromName('IZMIR')).toBe('35');
    expect(cityCodeFromName('Şanlıurfa')).toBe('63');
    expect(cityCodeFromName('sanliurfa')).toBe('63');
    expect(cityCodeFromName('Bilinmeyen Sehir')).toBeNull();
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

  it('gonderi olusturma bearer token ve alici bilgisiyle gider, teklifler donulur', async () => {
    const svc = new GeliverService(makeConfig({ GELIVER_API_TOKEN: 'tok123', GELIVER_TEST_MODE: '1' }));
    const fetchMock = jest.fn().mockResolvedValue({
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

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://api.geliver.io/api/v1/shipments');
    expect(init.headers.Authorization).toBe('Bearer tok123');
    const body = JSON.parse(String(init.body));
    expect(body.test).toBe(true);
    expect(body.recipientAddress.name).toBe('Ali Veli');
    expect(body.recipientAddress.cityCode).toBe('34');
    expect(body.recipientAddress.districtName).toBe('Kadıköy');
    expect(body.order.orderNumber).toBe('MIA-1');
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

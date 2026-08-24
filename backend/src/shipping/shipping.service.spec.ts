import { OrderStatus } from '../entities';
import { ShippingService } from './shipping.service';

const ORDER = {
  id: 'o1',
  orderNo: 'MIA-1',
  email: 'a@b.com',
  status: OrderStatus.CONFIRMED,
  subtotal: 1250,
  shippingName: 'Ali Veli',
  shippingPhone: '05551112233',
  shippingCity: 'İstanbul',
  shippingDistrict: 'Kadıköy',
  shippingAddress: 'Test Mah. No:1',
  shippingZip: '34000',
  geliverShipmentId: null as string | null,
  labelUrl: null as string | null,
  trackingNo: null as string | null,
  cargoCompany: null as string | null,
  statusHistory: [] as { status: string; at: string }[],
};

function makeService(
  overrides: { order?: Partial<typeof ORDER> | null; geliverEnabled?: boolean } = {},
) {
  const order = overrides.order === null ? null : { ...ORDER, ...overrides.order };
  const orders = {
    findOne: jest.fn().mockResolvedValue(order),
    save: jest.fn().mockImplementation((o) => Promise.resolve(o)),
  };
  const geliver = {
    enabled: overrides.geliverEnabled ?? true,
    createDraftWithOffers: jest.fn().mockResolvedValue({
      shipmentId: 'draft1',
      cheapestOfferId: 'of1',
      offers: [
        { id: 'of1', carrier: 'YURTICI', service: 'STD', amount: 89.9, currency: 'TL', estimatedTime: '' },
      ],
    }),
    acceptOffer: jest.fn().mockResolvedValue({
      shipmentId: 'shp1',
      trackingNo: 'TRK1',
      carrier: 'YURTICI',
      labelUrl: 'http://label',
    }),
    cancelShipment: jest.fn().mockResolvedValue(undefined),
    mapTrackingStatus: jest.fn((s: string) =>
      s === 'DELIVERED' ? OrderStatus.DELIVERED : s === 'TRANSIT' ? OrderStatus.SHIPPED : null,
    ),
  };
  const settings = { get: jest.fn().mockResolvedValue({ defaultDesi: 2 }) };
  const mail = { orderShipped: jest.fn() };
  const logs = { record: jest.fn() };
  const svc = new ShippingService(
    orders as never,
    geliver as never,
    settings as never,
    mail as never,
    logs as never,
  );
  return { svc, orders, geliver, mail, order };
}

describe('ShippingService', () => {
  it('otomatik olusturma en ucuz teklifi kabul edip siparise yazar', async () => {
    const { svc, orders, geliver } = makeService();
    await svc.autoCreateForOrder('o1');
    expect(geliver.createDraftWithOffers).toHaveBeenCalled();
    expect(geliver.acceptOffer).toHaveBeenCalledWith('of1');
    const saved = orders.save.mock.calls[0][0];
    expect(saved.geliverShipmentId).toBe('shp1');
    expect(saved.trackingNo).toBe('TRK1');
    expect(saved.cargoCompany).toBe('YURTICI');
    expect(saved.labelUrl).toBe('http://label');
  });

  it('geliver kapaliysa otomatik olusturma sessizce atlanir', async () => {
    const { svc, geliver } = makeService({ geliverEnabled: false });
    await expect(svc.autoCreateForOrder('o1')).resolves.toBeUndefined();
    expect(geliver.createDraftWithOffers).not.toHaveBeenCalled();
  });

  it('etiketi alinmis siparis icin tekrar olusturulmaz', async () => {
    const { svc, geliver } = makeService({
      order: { geliverShipmentId: 'eski', labelUrl: 'http://eski' },
    });
    await svc.autoCreateForOrder('o1');
    expect(geliver.createDraftWithOffers).not.toHaveBeenCalled();
    expect(geliver.acceptOffer).not.toHaveBeenCalled();
  });

  it('geliver hatasi autoCreate disina sizmasin', async () => {
    const { svc, geliver } = makeService();
    geliver.createDraftWithOffers.mockRejectedValue(new Error('patladi'));
    await expect(svc.autoCreateForOrder('o1')).resolves.toBeUndefined();
  });

  it('secilen teklifle olusturma dogru teklifi kabul eder', async () => {
    const { svc, geliver, orders } = makeService();
    await svc.createForOrder('o1', 'of99');
    expect(geliver.acceptOffer).toHaveBeenCalledWith('of99');
    expect(geliver.createDraftWithOffers).not.toHaveBeenCalled();
    expect(orders.save).toHaveBeenCalled();
  });

  it('iptal gonderiyi Geliverda iptal edip alanlari temizler', async () => {
    const { svc, geliver, orders } = makeService({
      order: {
        geliverShipmentId: 'shp1',
        labelUrl: 'http://label',
        trackingNo: 'TRK1',
        cargoCompany: 'YURTICI',
      },
    });
    await svc.cancelForOrder('o1');
    expect(geliver.cancelShipment).toHaveBeenCalledWith('shp1');
    const saved = orders.save.mock.calls[0][0];
    expect(saved.geliverShipmentId).toBeNull();
    expect(saved.trackingNo).toBeNull();
    expect(saved.labelUrl).toBeNull();
  });

  it('webhook teslim durumunda siparisi DELIVERED yapar', async () => {
    const { svc, orders } = makeService({
      order: { geliverShipmentId: 'shp1', status: OrderStatus.SHIPPED },
    });
    await svc.handleWebhook({
      event: 'TRACK_UPDATED',
      data: { id: 'shp1', trackingStatus: { trackingStatusCode: 'DELIVERED' } },
    });
    const saved = orders.save.mock.calls[0][0];
    expect(saved.status).toBe(OrderStatus.DELIVERED);
  });

  it('webhook tasimada durumunda SHIPPED yapar ve kargo maili atar', async () => {
    const { svc, orders, mail } = makeService({
      order: { geliverShipmentId: 'shp1', trackingNo: 'TRK1', cargoCompany: 'YURTICI' },
    });
    await svc.handleWebhook({
      event: 'TRACK_UPDATED',
      data: {
        id: 'shp1',
        trackingNumber: 'TRK1',
        trackingStatus: { trackingStatusCode: 'TRANSIT' },
      },
    });
    const saved = orders.save.mock.calls[0][0];
    expect(saved.status).toBe(OrderStatus.SHIPPED);
    expect(mail.orderShipped).toHaveBeenCalledWith('a@b.com', 'MIA-1', 'YURTICI', 'TRK1');
  });

  it('webhook bilinmeyen gonderiyi yok sayar', async () => {
    const { svc, orders } = makeService({ order: null });
    await expect(
      svc.handleWebhook({
        event: 'TRACK_UPDATED',
        data: { id: 'yok', trackingStatus: { trackingStatusCode: 'DELIVERED' } },
      }),
    ).resolves.toBeUndefined();
    expect(orders.save).not.toHaveBeenCalled();
  });

  it('webhook gec gelen takip numarasini siparise isler', async () => {
    const { svc, orders } = makeService({
      order: { geliverShipmentId: 'shp1', trackingNo: null },
    });
    await svc.handleWebhook({
      event: 'TRACK_UPDATED',
      data: {
        id: 'shp1',
        trackingNumber: 'TRKX',
        trackingStatus: { trackingStatusCode: 'PRE_TRANSIT' },
      },
    });
    const saved = orders.save.mock.calls[0][0];
    expect(saved.trackingNo).toBe('TRKX');
  });
});

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
  shippingDesi: null as number | null,
  shippingError: null as string | null,
  statusHistory: [] as { status: string; at: string }[],
};

function makeService(
  overrides: { order?: Partial<typeof ORDER> | null; geliverEnabled?: boolean } = {},
) {
  const order = overrides.order === null ? null : { ...ORDER, ...overrides.order };
  const orders = {
    findOne: jest.fn().mockResolvedValue(order),
    save: jest.fn().mockImplementation((o) => Promise.resolve(o)),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
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
    listDistricts: jest.fn().mockResolvedValue(['Kadıköy', 'Beşiktaş']),
    // Gercek servis gibi: eslesirse Geliverin yazimini, eslesmezse null doner
    resolveDistrict: jest.fn((_code: string, d: string) => {
      const found = ['Kadıköy', 'Beşiktaş'].find(
        (n) => n.toLocaleLowerCase('tr') === d.toLocaleLowerCase('tr'),
      );
      return Promise.resolve(found ?? null);
    }),
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

  it('geliver hatasi autoCreate disina sizmasin ve sebep siparise yazilsin', async () => {
    const { svc, geliver, orders } = makeService();
    geliver.createDraftWithOffers.mockRejectedValue(new Error('patladi'));
    await expect(svc.autoCreateForOrder('o1')).resolves.toBeUndefined();
    expect(orders.update).toHaveBeenCalledWith({ id: 'o1' }, { shippingError: 'patladi' });
  });

  it('taninmayan il autoCreate icin Geliver istegi yapmadan sebebi yazar', async () => {
    const { svc, geliver, orders } = makeService({ order: { shippingCity: 'Bilinmeyen' } });
    await svc.autoCreateForOrder('o1');
    expect(geliver.createDraftWithOffers).not.toHaveBeenCalled();
    expect(orders.update.mock.calls[0][1].shippingError).toContain('tanınamadı');
  });

  it('eksik teslimat bilgisi olan siparis icin teklif istenmez', async () => {
    const { svc, geliver } = makeService({ order: { shippingAddress: '  ' } });
    await expect(svc.offersForOrder('o1')).rejects.toThrow('Kargo için eksik bilgi');
    expect(geliver.createDraftWithOffers).not.toHaveBeenCalled();
  });

  it('gonderisi olan siparise ikinci etiket alinamaz', async () => {
    const { svc, geliver } = makeService({ order: { geliverShipmentId: 'shp1' } });
    await expect(svc.createForOrder('o1', 'of99')).rejects.toThrow('zaten bir gönderi var');
    expect(geliver.acceptOffer).not.toHaveBeenCalled();
  });

  it('teslimat bilgisi guncellemesi desi ve il dogrular', async () => {
    const { svc, orders } = makeService();
    const saved = await svc.updateShippingInfo('o1', {
      shippingCity: 'İzmir',
      shippingDesi: 4,
    });
    expect(saved.shippingCity).toBe('İzmir');
    expect(saved.shippingDesi).toBe(4);
    expect(saved.shippingError).toBeNull();
    expect(orders.save).toHaveBeenCalled();

    await expect(
      svc.updateShippingInfo('o1', { shippingCity: 'Bilinmeyen' }),
    ).rejects.toThrow('tanınamadı');
  });

  it('serbest yazilan il adi resmi yazima cevrilerek kaydedilir', async () => {
    const { svc } = makeService();
    const saved = await svc.updateShippingInfo('o1', { shippingCity: 'ISTANBUL' });
    expect(saved.shippingCity).toBe('İstanbul');
  });

  it('Geliverda olmayan ilce kaydedilmez', async () => {
    const { svc, geliver } = makeService();
    geliver.resolveDistrict.mockResolvedValue(null);
    await expect(
      svc.updateShippingInfo('o1', { shippingDistrict: 'Olmayan' }),
    ).rejects.toThrow('ilçesi İstanbul için tanınamadı');
  });

  it('siparis bazli desi magaza varsayilanini ezer', async () => {
    const { svc, geliver } = makeService({ order: { shippingDesi: 7 } });
    await svc.autoCreateForOrder('o1');
    expect(geliver.createDraftWithOffers.mock.calls[0][0].desi).toBe(7);
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

  it('webhook gec gelen TRANSIT bildirimi DELIVERED siparisi geri dusuremez', async () => {
    const { svc, orders, mail } = makeService({
      order: { geliverShipmentId: 'shp1', status: OrderStatus.DELIVERED },
    });
    await svc.handleWebhook({
      event: 'TRACK_UPDATED',
      data: { id: 'shp1', trackingStatus: { trackingStatusCode: 'TRANSIT' } },
    });
    const saved = orders.save.mock.calls[0][0];
    expect(saved.status).toBe(OrderStatus.DELIVERED);
    expect(mail.orderShipped).not.toHaveBeenCalled();
  });

  it('webhook iptal edilmis siparisin durumunu degistirmez', async () => {
    const { svc, orders } = makeService({
      order: { geliverShipmentId: 'shp1', status: OrderStatus.CANCELLED },
    });
    await svc.handleWebhook({
      event: 'TRACK_UPDATED',
      data: { id: 'shp1', trackingStatus: { trackingStatusCode: 'DELIVERED' } },
    });
    const saved = orders.save.mock.calls[0][0];
    expect(saved.status).toBe(OrderStatus.CANCELLED);
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

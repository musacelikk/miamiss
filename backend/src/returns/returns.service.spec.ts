import { ReturnStatus } from '../entities';
import { ReturnsService } from './returns.service';

const ADMIN = { id: 'admin1', email: 'admin@miamisuhome.com' };

const REQUEST = {
  id: 'r1',
  returnNo: 'IAD-ABC123',
  orderId: 'o1',
  orderNo: 'MIA-1',
  email: 'musteri@example.com',
  status: ReturnStatus.APPROVED,
  adminNote: null as string | null,
  geliverShipmentId: null as string | null,
  trackingNo: null as string | null,
  cargoCompany: null as string | null,
  labelUrl: null as string | null,
  shippingError: null as string | null,
};

function makeService(
  overrides: {
    request?: Partial<typeof REQUEST> | null;
    shippingEnabled?: boolean;
  } = {},
) {
  const request = overrides.request === null ? null : { ...REQUEST, ...overrides.request };
  const returns = {
    findOne: jest.fn().mockResolvedValue(request),
    save: jest.fn().mockImplementation((r) => Promise.resolve(r)),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const shipping = {
    enabled: overrides.shippingEnabled ?? true,
    createReturnShipment: jest.fn().mockResolvedValue({
      shipmentId: 'ret1',
      trackingNo: 'IADE123',
      carrier: 'SURAT',
      labelUrl: 'http://iade-label.pdf',
    }),
    cancelShipmentById: jest.fn().mockResolvedValue(undefined),
  };
  const mail = { returnDecisionToCustomer: jest.fn() };
  const logs = { record: jest.fn() };
  const svc = new ReturnsService(
    returns as never,
    shipping as never,
    mail as never,
    logs as never,
  );
  return { svc, returns, shipping, mail, logs };
}

describe('ReturnsService.decide', () => {
  it('onayda iade kargosu olusturup talebe yazar', async () => {
    const { svc, shipping, returns } = makeService({ request: { status: ReturnStatus.PENDING } });
    const res = await svc.decide('r1', { status: ReturnStatus.APPROVED }, ADMIN);

    expect(shipping.createReturnShipment).toHaveBeenCalledWith('o1');
    expect(res.geliverShipmentId).toBe('ret1');
    expect(res.trackingNo).toBe('IADE123');
    expect(res.cargoCompany).toBe('SURAT');
    expect(res.labelUrl).toBe('http://iade-label.pdf');
    expect(res.shippingError).toBeNull();
    expect(returns.save).toHaveBeenCalled();
  });

  it('karar e-postasi kargo kodunu icerir', async () => {
    const { svc, mail } = makeService({ request: { status: ReturnStatus.PENDING } });
    await svc.decide('r1', { status: ReturnStatus.APPROVED }, ADMIN);

    expect(mail.returnDecisionToCustomer).toHaveBeenCalledWith(
      'musteri@example.com',
      'IAD-ABC123',
      'MIA-1',
      ReturnStatus.APPROVED,
      null,
      { trackingNo: 'IADE123', carrier: 'SURAT' },
    );
  });

  it('kargo hatasi onayi bozmaz, sebep talebe yazilir', async () => {
    const { svc, shipping, returns, mail } = makeService({
      request: { status: ReturnStatus.PENDING },
    });
    shipping.createReturnShipment.mockRejectedValue(new Error('Geliver gönderisi yok'));

    const res = await svc.decide('r1', { status: ReturnStatus.APPROVED }, ADMIN);

    expect(res.status).toBe(ReturnStatus.APPROVED);
    expect(res.shippingError).toBe('Geliver gönderisi yok');
    expect(returns.update).toHaveBeenCalledWith(
      { id: 'r1' },
      { shippingError: 'Geliver gönderisi yok' },
    );
    // Kargo kodu olmadigi icin e-postaya kod eklenmez
    expect(mail.returnDecisionToCustomer.mock.calls[0][5]).toBeNull();
  });

  it('red kararinda kargo olusturulmaz', async () => {
    const { svc, shipping } = makeService({ request: { status: ReturnStatus.PENDING } });
    await svc.decide('r1', { status: ReturnStatus.REJECTED, adminNote: 'Süre aşıldı' }, ADMIN);
    expect(shipping.createReturnShipment).not.toHaveBeenCalled();
  });

  it('Geliver kapaliysa onay yine gecer, kargo denenmez', async () => {
    const { svc, shipping } = makeService({
      request: { status: ReturnStatus.PENDING },
      shippingEnabled: false,
    });
    const res = await svc.decide('r1', { status: ReturnStatus.APPROVED }, ADMIN);
    expect(shipping.createReturnShipment).not.toHaveBeenCalled();
    expect(res.status).toBe(ReturnStatus.APPROVED);
  });

  it('kargosu olan talep tekrar onaylanirsa ikinci kargo olusmaz', async () => {
    const { svc, shipping } = makeService({ request: { geliverShipmentId: 'ret1' } });
    await svc.decide('r1', { status: ReturnStatus.APPROVED }, ADMIN);
    expect(shipping.createReturnShipment).not.toHaveBeenCalled();
  });
});

describe('ReturnsService kargo yonetimi', () => {
  it('onaylanmamis talep icin kargo olusturmayi reddeder', async () => {
    const { svc } = makeService({ request: { status: ReturnStatus.PENDING } });
    await expect(svc.createShipment('r1')).rejects.toThrow(
      'yalnızca onaylanmış talepler için',
    );
  });

  it('kargosu olan talep icin ikinci kargoyu reddeder', async () => {
    const { svc } = makeService({ request: { geliverShipmentId: 'ret1' } });
    await expect(svc.createShipment('r1')).rejects.toThrow('zaten bir kargo var');
  });

  it('iptal kargo alanlarini temizler', async () => {
    const { svc, shipping } = makeService({
      request: {
        geliverShipmentId: 'ret1',
        trackingNo: 'IADE123',
        cargoCompany: 'SURAT',
        labelUrl: 'http://x',
      },
    });
    const res = await svc.cancelShipment('r1');
    expect(shipping.cancelShipmentById).toHaveBeenCalledWith('ret1');
    expect(res.geliverShipmentId).toBeNull();
    expect(res.trackingNo).toBeNull();
    expect(res.cargoCompany).toBeNull();
    expect(res.labelUrl).toBeNull();
  });

  it('kargosu olmayan talebin iptalini reddeder', async () => {
    const { svc } = makeService();
    await expect(svc.cancelShipment('r1')).rejects.toThrow('kargosu yok');
  });

  it('olmayan talep icin 404 verir', async () => {
    const { svc } = makeService({ request: null });
    await expect(svc.createShipment('yok')).rejects.toThrow('İade talebi bulunamadı');
  });
});

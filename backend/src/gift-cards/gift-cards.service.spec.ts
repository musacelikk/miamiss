import { GiftCard, GiftCardStatus } from '../entities';
import { GiftCardsService } from './gift-cards.service';

type Row = Partial<GiftCard> & { id: string; code: string; status: GiftCardStatus; balance: number };

function makeService() {
  const store: Row[] = [];
  let n = 0;
  const cards = {
    create: (d: Partial<GiftCard>) => ({ ...d }),
    save: jest.fn(async (c: Row) => {
      if (!c.id) c.id = `gc-${++n}`;
      const i = store.findIndex((x) => x.id === c.id);
      if (i >= 0) store[i] = { ...store[i], ...c };
      else store.push({ ...c });
      return store.find((x) => x.id === c.id)!;
    }),
    findOne: jest.fn(async ({ where }: { where: { id?: string; code?: string } }) => {
      if (where.code) return store.find((c) => c.code === where.code) ?? null;
      if (where.id) return store.find((c) => c.id === where.id) ?? null;
      return null;
    }),
    update: jest.fn(async ({ id }: { id: string }, patch: Partial<GiftCard>) => {
      const c = store.find((x) => x.id === id);
      if (c) Object.assign(c, patch);
    }),
  };
  const svc = new GiftCardsService(cards as never);
  return { svc, store };
}

describe('GiftCardsService', () => {
  it('satin alinan kart odeme onayi oncesi GIFT kodu almaz', async () => {
    const { svc, store } = makeService();
    const card = await svc.createPending({
      amount: 500,
      purchaserEmail: 'a@b.com',
    });
    expect(card.status).toBe(GiftCardStatus.PENDING);
    expect(card.code.startsWith('GIFT-')).toBe(false);
    expect(store[0].status).toBe(GiftCardStatus.PENDING);
  });

  it('odeme onaylanmadan kod kullanilamaz', async () => {
    const { svc } = makeService();
    const card = await svc.createPending({ amount: 250, purchaserEmail: 'a@b.com' });
    await expect(svc.check(card.code)).rejects.toThrow(/aktifleşmedi|ödeme/i);
    await expect(svc.redeem(card.code, 100)).rejects.toThrow(/aktifleşmedi|ödeme/i);
  });

  it('odeme onayinda GIFT kodu uretilir ve kart aktiflesir', async () => {
    const { svc } = makeService();
    const pending = await svc.createPending({ amount: 250, purchaserEmail: 'a@b.com' });
    const holdCode = pending.code;
    const active = await svc.activate(pending.id);
    expect(active.status).toBe(GiftCardStatus.ACTIVE);
    expect(active.code.startsWith('GIFT-')).toBe(true);
    expect(active.code).not.toBe(holdCode);
    const checked = await svc.check(active.code);
    expect(checked.balance).toBe(250);
  });

  it('ikinci aktivasyon ayni GIFT kodunu korur', async () => {
    const { svc } = makeService();
    const pending = await svc.createPending({ amount: 100, purchaserEmail: 'a@b.com' });
    const first = await svc.activate(pending.id);
    const second = await svc.activate(pending.id);
    expect(second.code).toBe(first.code);
    expect(second.status).toBe(GiftCardStatus.ACTIVE);
  });

  it('eski PENDING GIFT kodu odeme onayi olmadan kullanilamaz, onayda kodu degismez', async () => {
    const { svc, store } = makeService();
    store.push({
      id: 'old-1',
      code: 'GIFT-AAAA-BBBB-CCCC',
      status: GiftCardStatus.PENDING,
      balance: 300,
      initialAmount: 300,
    } as Row);
    await expect(svc.check('GIFT-AAAA-BBBB-CCCC')).rejects.toThrow(/aktifleşmedi|ödeme/i);
    const active = await svc.activate('old-1');
    expect(active.code).toBe('GIFT-AAAA-BBBB-CCCC');
    expect(active.status).toBe(GiftCardStatus.ACTIVE);
  });

  it('iptal edilmis aktif kart kullanilamaz', async () => {
    const { svc, store } = makeService();
    store.push({
      id: 'x',
      code: 'GIFT-1111-2222-3333',
      status: GiftCardStatus.DISABLED,
      balance: 100,
    } as Row);
    await expect(svc.check('GIFT-1111-2222-3333')).rejects.toThrow(/kapatılmış/i);
  });

  it('musteriye gosterilecek kod yalnizca aktif/tukenmis kartta vardir', () => {
    const { svc } = makeService();
    expect(svc.publicCode({ code: 'WAIT-ABC', status: GiftCardStatus.DISABLED })).toBe('');
    expect(svc.publicCode({ code: 'GIFT-AAAA-BBBB-CCCC', status: GiftCardStatus.PENDING })).toBe('');
    expect(svc.publicCode({ code: 'GIFT-AAAA-BBBB-CCCC', status: GiftCardStatus.ACTIVE })).toBe(
      'GIFT-AAAA-BBBB-CCCC',
    );
    expect(svc.publicCode({ code: 'GIFT-AAAA-BBBB-CCCC', status: GiftCardStatus.DEPLETED })).toBe(
      'GIFT-AAAA-BBBB-CCCC',
    );
  });
});

import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { PaytrService, paytrConfigured } from './paytr.service';

const makeConfig = (env: Record<string, string>) =>
  ({ get: (k: string) => env[k] } as unknown as ConfigService);

const ENV = {
  PAYTR_MERCHANT_ID: '123456',
  PAYTR_MERCHANT_KEY: 'testkey',
  PAYTR_MERCHANT_SALT: 'testsalt',
  PAYTR_TEST_MODE: '1',
};

function ornekStart() {
  return {
    merchantOid: 'MIAABC123',
    email: 'a@b.com',
    amount: 1250.5,
    userIp: '1.2.3.4',
    userName: 'Ali Veli',
    userAddress: 'Test Mah. No:1 Kadikoy/Istanbul',
    userPhone: '05551112233',
    basket: [['Mumluk', '1250.50', 1]] as [string, string, number][],
    okUrl: 'http://localhost:3000/siparis-basarili?paytr=1',
    failUrl: 'http://localhost:3000/odeme?payment=failed',
    card: {
      cardHolder: 'Ali Veli',
      cardNumber: '4111111111111111',
      expiryMonth: '12',
      expiryYear: '30',
      cvv: '000',
    },
  };
}

describe('PaytrService', () => {
  it('uc anahtar da doluysa enabled=true olur', () => {
    expect(new PaytrService(makeConfig(ENV)).enabled).toBe(true);
    expect(paytrConfigured(makeConfig(ENV))).toBe(true);
  });

  it('anahtar eksikse enabled=false olur', () => {
    const { PAYTR_MERCHANT_KEY: _drop, ...eksik } = ENV;
    expect(new PaytrService(makeConfig(eksik)).enabled).toBe(false);
    expect(paytrConfigured(makeConfig(eksik))).toBe(false);
  });

  it('paytr_token dogru dizilimle HMAC-SHA256/base64 uretir', () => {
    const svc = new PaytrService(makeConfig(ENV));
    const token = svc.buildToken({
      merchantOid: 'MIAABC123',
      userIp: '1.2.3.4',
      email: 'a@b.com',
      amount: '1250.50',
    });
    const raw =
      '123456' + '1.2.3.4' + 'MIAABC123' + 'a@b.com' + '1250.50' +
      'card' + '0' + 'TL' + '1' + '0' + 'testsalt';
    const expected = createHmac('sha256', 'testkey').update(raw).digest('base64');
    expect(token).toBe(expected);
  });

  it('gecerli callback hash dogrulanir, bozuk hash reddedilir', () => {
    const svc = new PaytrService(makeConfig(ENV));
    const body = { merchant_oid: 'MIAABC123', status: 'success', total_amount: '125050' };
    const hash = createHmac('sha256', 'testkey')
      .update('MIAABC123' + 'testsalt' + 'success' + '125050')
      .digest('base64');
    expect(svc.verifyCallback({ ...body, hash })).toBe(true);
    expect(svc.verifyCallback({ ...body, hash: 'bozuk' })).toBe(false);
    expect(svc.verifyCallback(body)).toBe(false);
  });

  it('startPayment PayTR JSON hata donerse BadRequest firlatir', async () => {
    const svc = new PaytrService(makeConfig(ENV));
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{"status":"error","reason":"Kart bilgisi hatali"}'),
    }) as unknown as typeof fetch;
    await expect(svc.startPayment(ornekStart())).rejects.toThrow('Kart bilgisi hatali');
  });

  it('startPayment HTML donerse aynen dondurur ve kart alanlarini POST eder', async () => {
    const svc = new PaytrService(makeConfig(ENV));
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<html>3d</html>'),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const html = await svc.startPayment(ornekStart());
    expect(html).toBe('<html>3d</html>');
    const bodySent = String(fetchMock.mock.calls[0][1].body);
    expect(bodySent).toContain('card_number=4111111111111111');
    expect(bodySent).toContain('non_3d=0');
    expect(bodySent).toContain('payment_type=card');
  });
});

# PayTR + Geliver Entegrasyonu Implementasyon Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PayTR Direct API (her zaman 3D Secure) ile kredi kartı ödemesi ve Geliver ile kargo gönderisi yönetimi (otomatik + admin panel + webhook) eklemek.

**Architecture:** Backend'e iki yeni NestJS modülü eklenir: `payments` (PayTR token üretimi, 3D başlatma, callback) ve `shipping` (Geliver istemcisi, admin uçları, webhook, otomatik gönderi). Sipariş akışı korunur: sipariş PENDING oluşur → 3D → PayTR callback'i `setPaymentStatus(PAID)` çağırır → mevcut onay/mail/hediye kartı mantığı çalışır → ödeme onayında Geliver gönderisi otomatik oluşturulur. Frontend'de checkout'a kart formu, admin paneline kargo paneli ve gönderici ayarları eklenir.

**Tech Stack:** NestJS 11 + TypeORM + PostgreSQL, Next.js (app router), global `fetch` (Node 18+), `crypto` HMAC-SHA256, Jest + ts-jest.

**Spec:** `docs/superpowers/specs/2026-08-24-paytr-geliver-design.md`

## Global Constraints

- Anahtarlar yalnızca env'den okunur: `PAYTR_MERCHANT_ID`, `PAYTR_MERCHANT_KEY`, `PAYTR_MERCHANT_SALT`, `PAYTR_TEST_MODE`, `GELIVER_API_TOKEN`, `GELIVER_WEBHOOK_SECRET`, `PUBLIC_SITE_URL`. `.env` repo'ya girmez (zaten gitignore'da); `backend/.env.example` güncel tutulur.
- Kart verisi (numara, CVV, SKT) hiçbir yerde loglanmaz, DB'ye yazılmaz, hata mesajlarına eklenmez; yalnızca PayTR'ye iletilir.
- Anahtarlar boşken site bugünkü gibi çalışmalı: kart seçeneği görünmez (`cardEnabled=false`), Geliver uçları "yapılandırılmamış" döner, otomatik gönderi sessizce atlanır.
- Tüm kullanıcıya görünen metinler Türkçe; kod yorumları mevcut stildeki gibi Türkçe.
- Para tutarları mevcut kalıpla `round2` / `toFixed(2)`; müşteri kargo ücreti hesabı DEĞİŞMEZ.
- DB şeması: geliştirmede `synchronize` açık olduğundan entity değişikliği yeterli; elle migration yazılmaz (üretim `migration:generate` ile ayrı yönetiliyor).
- Her task TDD ile ilerler (backend); frontend taskları `npm run build` ile doğrulanır. Her task sonunda commit.
- Spec'ten bilinçli sapma: gönderi oluşturmak siparişi hemen SHIPPED yapmaz (etiket basılması ≠ kargoya veriliş). SHIPPED durumu ve kargo maili, Geliver webhook'u "taşımada" dediğinde veya admin elle işaretlediğinde tetiklenir.

---

### Task 1: PaytrService — token üretimi, callback doğrulama, 3D başlatma

**Files:**
- Create: `backend/src/payments/paytr.service.ts`
- Create: `backend/src/payments/paytr.service.spec.ts`
- Create: `backend/.env.example`

**Interfaces:**
- Consumes: `ConfigService` (`@nestjs/config`, global).
- Produces (sonraki tasklar bunlara güvenir):
  - `PaytrService.enabled: boolean`
  - `PaytrService.buildToken(p: { merchantOid: string; userIp: string; email: string; amount: string }): string`
  - `PaytrService.verifyCallback(body: Record<string, string>): boolean`
  - `PaytrService.startPayment(p: PaytrStartParams): Promise<string>` — 3D HTML döner
  - `paytrConfigured(config: ConfigService): boolean` (aynı dosyadan export)

**Not (doğrulama):** PayTR Direct API'de `payment_amount` ondalıklı TL'dir (örn. `"1250.50"`); iFrame API'deki kuruş formatıyla karıştırılmamalıdır. Uygulamadan önce https://www.paytr.com/odeme/api/direct-api sayfasından (WebFetch ile) token sırası ve alan adları teyit edilir: token dizilimi `merchant_id + user_ip + merchant_oid + email + payment_amount + payment_type + installment_count + currency + test_mode + non_3d` + `merchant_salt`, HMAC-SHA256 anahtarı `merchant_key`, çıktı base64. Callback hash: `merchant_oid + merchant_salt + status + total_amount`. Doküman farklı söylüyorsa doküman esas alınır ve test fixture'ları ona göre yazılır.

- [ ] **Step 1: Başarısız testleri yaz**

`backend/src/payments/paytr.service.spec.ts`:

```ts
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
    await expect(
      svc.startPayment(ornekStart()),
    ).rejects.toThrow('Kart bilgisi hatali');
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
```

- [ ] **Step 2: Testlerin FAIL ettiğini doğrula**

Run: `cd backend && npx jest payments/paytr.service.spec.ts`
Expected: FAIL — "Cannot find module './paytr.service'"

- [ ] **Step 3: Servisi yaz**

`backend/src/payments/paytr.service.ts`:

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

/** PayTR anahtarlarinin uc ayagi da doluysa kart odemesi acilabilir. */
export function paytrConfigured(config: ConfigService): boolean {
  return Boolean(
    config.get('PAYTR_MERCHANT_ID') &&
      config.get('PAYTR_MERCHANT_KEY') &&
      config.get('PAYTR_MERCHANT_SALT'),
  );
}

export interface PaytrCard {
  cardHolder: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

export interface PaytrStartParams {
  merchantOid: string;
  email: string;
  /** TL, ondalikli (orn. 1250.5) */
  amount: number;
  userIp: string;
  userName: string;
  userAddress: string;
  userPhone: string;
  /** PayTR sepet formati: [ad, birim fiyat, adet] */
  basket: [string, string, number][];
  okUrl: string;
  failUrl: string;
  card: PaytrCard;
}

const PAYTR_URL = 'https://secure.paytr.com/odeme';

@Injectable()
export class PaytrService {
  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return paytrConfigured(this.config);
  }

  private get merchantId(): string {
    return this.config.get('PAYTR_MERCHANT_ID') ?? '';
  }
  private get merchantKey(): string {
    return this.config.get('PAYTR_MERCHANT_KEY') ?? '';
  }
  private get merchantSalt(): string {
    return this.config.get('PAYTR_MERCHANT_SALT') ?? '';
  }
  /** Aksi soylenmedikce test modunda calisir; canliya PAYTR_TEST_MODE=0 ile gecilir. */
  private get testMode(): string {
    return this.config.get('PAYTR_TEST_MODE') === '0' ? '0' : '1';
  }

  buildToken(p: { merchantOid: string; userIp: string; email: string; amount: string }): string {
    const raw =
      this.merchantId + p.userIp + p.merchantOid + p.email + p.amount +
      'card' + '0' + 'TL' + this.testMode + '0' + this.merchantSalt;
    return createHmac('sha256', this.merchantKey).update(raw).digest('base64');
  }

  verifyCallback(body: Record<string, string>): boolean {
    if (!body.hash || !body.merchant_oid || !body.status || body.total_amount == null) {
      return false;
    }
    const expected = createHmac('sha256', this.merchantKey)
      .update(body.merchant_oid + this.merchantSalt + body.status + body.total_amount)
      .digest('base64');
    const a = Buffer.from(expected);
    const b = Buffer.from(body.hash);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  async startPayment(p: PaytrStartParams): Promise<string> {
    if (!this.enabled) {
      throw new BadRequestException('Kredi kartı ile ödeme şu anda kullanılamıyor.');
    }
    const amount = p.amount.toFixed(2);
    const form = new URLSearchParams({
      merchant_id: this.merchantId,
      user_ip: p.userIp,
      merchant_oid: p.merchantOid,
      email: p.email,
      payment_amount: amount,
      payment_type: 'card',
      installment_count: '0',
      currency: 'TL',
      test_mode: this.testMode,
      non_3d: '0',
      merchant_ok_url: p.okUrl,
      merchant_fail_url: p.failUrl,
      user_name: p.userName,
      user_address: p.userAddress,
      user_phone: p.userPhone,
      user_basket: Buffer.from(JSON.stringify(p.basket)).toString('base64'),
      paytr_token: this.buildToken({
        merchantOid: p.merchantOid,
        userIp: p.userIp,
        email: p.email,
        amount,
      }),
      cc_owner: p.card.cardHolder,
      card_number: p.card.cardNumber,
      expiry_month: p.card.expiryMonth,
      expiry_year: p.card.expiryYear,
      cvv: p.card.cvv,
      debug_on: '0',
      client_lang: 'tr',
    });

    const res = await fetch(PAYTR_URL, { method: 'POST', body: form });
    const text = await res.text();
    // Basarida 3D yonlendirme HTML'i; hatada JSON gelir.
    if (text.trimStart().startsWith('{')) {
      let reason = 'Ödeme başlatılamadı.';
      try {
        reason = (JSON.parse(text) as { reason?: string }).reason ?? reason;
      } catch {
        /* JSON degilse genel mesaj */
      }
      throw new BadRequestException(reason);
    }
    return text;
  }
}
```

- [ ] **Step 4: Testlerin PASS ettiğini doğrula**

Run: `cd backend && npx jest payments/paytr.service.spec.ts`
Expected: PASS (6 test)

- [ ] **Step 5: `.env.example` oluştur**

`backend/.env.example`:

```
# Veritabani
DATABASE_URL=postgres://user:pass@localhost:5432/miamiss
DB_SYNC=true

# PayTR Direct API (https://www.paytr.com — Magaza Paneli > Bilgi)
# Uc alan da dolmadan kart odeme secenegi sitede gorunmez.
PAYTR_MERCHANT_ID=
PAYTR_MERCHANT_KEY=
PAYTR_MERCHANT_SALT=
# 1 = test modu, 0 = canli
PAYTR_TEST_MODE=1

# Geliver (https://geliver.io — API token)
# Bos birakilirsa kargo entegrasyonu kapali kalir, admin elle takip no girer.
GELIVER_API_TOKEN=
# Webhook dogrulamasi icin sizin belirleyeceginiz gizli deger
GELIVER_WEBHOOK_SECRET=

# 3D donus adresleri icin site adresi
PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 6: Commit**

```bash
cd /Users/bilalorhanlar/Desktop/miamiss
git add backend/src/payments backend/.env.example
git commit -m "feat(payments): PayTR Direct API servisi — token, callback dogrulama, 3D baslatma"
```

---

### Task 2: Order entity kolonları + merchant_oid üretimi + CARD kapısı

**Files:**
- Modify: `backend/src/entities/order.entity.ts` (satır ~117-121 civarı, trackingNo/cargoCompany yanına)
- Modify: `backend/src/orders/orders.service.ts` (satır 94-96 CARD bloğu; satır 268-300 order create)
- Modify: `backend/src/orders/orders.controller.ts` (satır 173-183 create cevabı)

**Interfaces:**
- Consumes: `paytrConfigured(config)` (Task 1).
- Produces: `Order.paytrMerchantOid: string | null` (unique), `Order.geliverShipmentId: string | null`, `Order.labelUrl: string | null`; `POST /api/orders` cevabına `id: string` alanı eklenir.

- [ ] **Step 1: Entity'ye kolonları ekle**

`order.entity.ts` içinde `trackingNo`/`cargoCompany` kolonlarının hemen altına:

```ts
  /** PayTR merchant_oid (alfanumerik zorunlu; orderNo'daki tire kullanilamaz) */
  @Column({ type: 'varchar', nullable: true, unique: true })
  paytrMerchantOid: string | null;

  /** Geliver gonderi kimligi */
  @Column({ type: 'varchar', nullable: true })
  geliverShipmentId: string | null;

  /** Kargo etiketi (PDF/barkod) adresi */
  @Column({ type: 'varchar', nullable: true })
  labelUrl: string | null;
```

- [ ] **Step 2: CARD bloğunu env kontrolüyle değiştir ve merchant_oid üret**

`orders.service.ts`:

1. Import'lara ekle: `import { ConfigService } from '@nestjs/config';` ve `import { paytrConfigured } from '../payments/paytr.service';`
2. Constructor'a ekle (en sona): `private readonly configService: ConfigService,`
3. Şu bloğu:

```ts
    if (input.paymentMethod === PaymentMethod.CARD) {
      throw new BadRequestException('Kredi kartı ile ödeme çok yakında aktif olacak.');
    }
```

şununla değiştir:

```ts
    if (input.paymentMethod === PaymentMethod.CARD && !paytrConfigured(this.configService)) {
      throw new BadRequestException('Kredi kartı ile ödeme şu anda kullanılamıyor.');
    }
```

4. `manager.create(Order, { ... })` içinde `orderNo: this.generateOrderNo(),` satırının altına:

```ts
          paytrMerchantOid: 'MIA' + randomBytes(6).toString('hex').toUpperCase(),
```

(`randomBytes` zaten import edilmiş durumda.)

- [ ] **Step 3: Create cevabına `id` ekle**

`orders.controller.ts` `create()` dönüşünde `orderNo: order.orderNo,` satırının üstüne `id: order.id,` ekle.

- [ ] **Step 4: Derleme + testler**

Run: `cd backend && npm run build && npx jest payments`
Expected: build hatasız, testler PASS.

Not: `payments/paytr.service.ts` henüz bir modüle bağlı değil; sadece derlenmesi yeterli.

- [ ] **Step 5: Commit**

```bash
git add backend/src/entities/order.entity.ts backend/src/orders/orders.service.ts backend/src/orders/orders.controller.ts
git commit -m "feat(orders): paytrMerchantOid/geliver kolonlari, CARD env kapisi, create cevabina id"
```

---

### Task 3: PaymentsController — config, start, callback + modül kaydı

**Files:**
- Create: `backend/src/payments/payments.controller.ts`
- Create: `backend/src/payments/payments.controller.spec.ts`
- Create: `backend/src/payments/payments.module.ts`
- Modify: `backend/src/orders/orders.module.ts` (OrdersService export)
- Modify: `backend/src/app.module.ts` (PaymentsModule import)

**Interfaces:**
- Consumes: `PaytrService` (Task 1), `OrdersService.setPaymentStatus(id, status)`, `Order.paytrMerchantOid` (Task 2), `LogsService.record` (global LogsModule).
- Produces:
  - `GET /api/payments/config` → `{ cardEnabled: boolean }`
  - `POST /api/payments/paytr/start` → `{ html: string }`
  - `POST /api/payments/paytr/callback` → düz metin `"OK"`

- [ ] **Step 1: Başarısız controller testini yaz**

`backend/src/payments/payments.controller.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { PaymentStatus } from '../entities';
import { PaymentsController } from './payments.controller';

describe('PaymentsController', () => {
  const paytr = {
    enabled: true,
    verifyCallback: jest.fn(),
    startPayment: jest.fn(),
  };
  const ordersService = { setPaymentStatus: jest.fn() };
  const ordersRepo = { findOne: jest.fn() };
  const logs = { record: jest.fn() };
  const config = { get: (k: string) => (k === 'PUBLIC_SITE_URL' ? 'http://site' : undefined) };

  const controller = new PaymentsController(
    paytr as never,
    ordersService as never,
    ordersRepo as never,
    logs as never,
    config as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('config kart durumunu doner', () => {
    expect(controller.getConfig()).toEqual({ cardEnabled: true });
  });

  it('callback gecersiz hash ile reddedilir', async () => {
    paytr.verifyCallback.mockReturnValue(false);
    await expect(controller.callback({ merchant_oid: 'X' })).rejects.toThrow(BadRequestException);
    expect(ordersService.setPaymentStatus).not.toHaveBeenCalled();
  });

  it('callback success siparisi PAID yapar ve OK doner', async () => {
    paytr.verifyCallback.mockReturnValue(true);
    ordersRepo.findOne.mockResolvedValue({ id: 'o1', paymentStatus: PaymentStatus.PENDING, orderNo: 'MIA-1', email: 'a@b.com' });
    const res = await controller.callback({ merchant_oid: 'MIAX', status: 'success', total_amount: '100', hash: 'h' });
    expect(ordersService.setPaymentStatus).toHaveBeenCalledWith('o1', PaymentStatus.PAID);
    expect(res).toBe('OK');
  });

  it('callback zaten PAID siparis icin tekrar islem yapmaz (idempotent)', async () => {
    paytr.verifyCallback.mockReturnValue(true);
    ordersRepo.findOne.mockResolvedValue({ id: 'o1', paymentStatus: PaymentStatus.PAID });
    const res = await controller.callback({ merchant_oid: 'MIAX', status: 'success', total_amount: '100', hash: 'h' });
    expect(ordersService.setPaymentStatus).not.toHaveBeenCalled();
    expect(res).toBe('OK');
  });

  it('callback failed siparisi FAILED yapar', async () => {
    paytr.verifyCallback.mockReturnValue(true);
    ordersRepo.findOne.mockResolvedValue({ id: 'o1', paymentStatus: PaymentStatus.PENDING, orderNo: 'MIA-1', email: 'a@b.com' });
    await controller.callback({ merchant_oid: 'MIAX', status: 'failed', total_amount: '0', hash: 'h' });
    expect(ordersService.setPaymentStatus).toHaveBeenCalledWith('o1', PaymentStatus.FAILED);
  });

  it('start yanlis odeme yontemli siparisi reddeder', async () => {
    ordersRepo.findOne.mockResolvedValue({ id: 'o1', paymentMethod: 'BANK_TRANSFER' });
    await expect(
      controller.start(
        { orderId: 'o1', cardHolder: 'A B', cardNumber: '4111111111111111', expiryMonth: '12', expiryYear: '30', cvv: '000' },
        { ip: '1.2.3.4' } as never,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
```

- [ ] **Step 2: FAIL doğrula**

Run: `cd backend && npx jest payments/payments.controller.spec.ts`
Expected: FAIL — "Cannot find module './payments.controller'"

- [ ] **Step 3: Controller + modülü yaz**

`backend/src/payments/payments.controller.ts`:

```ts
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Req,
  ValidationPipe,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsString, IsUUID, Matches, MinLength } from 'class-validator';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { Order, OrderItemType, PaymentMethod, PaymentStatus } from '../entities';
import { OrdersService } from '../orders/orders.service';
import { LogsService } from '../logs/logs.service';
import { PaytrService } from './paytr.service';

class StartPaytrDto {
  @IsUUID()
  orderId: string;

  @IsString()
  @MinLength(3)
  cardHolder: string;

  @Matches(/^\d{15,16}$/, { message: 'Kart numarası 15-16 haneli olmalıdır.' })
  cardNumber: string;

  @Matches(/^(0[1-9]|1[0-2])$/, { message: 'Son kullanma ayı geçersiz.' })
  expiryMonth: string;

  @Matches(/^\d{2}$/, { message: 'Son kullanma yılı geçersiz.' })
  expiryYear: string;

  @Matches(/^\d{3,4}$/, { message: 'CVV geçersiz.' })
  cvv: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paytr: PaytrService,
    private readonly ordersService: OrdersService,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    private readonly logs: LogsService,
    private readonly config: ConfigService,
  ) {}

  @Get('config')
  getConfig() {
    return { cardEnabled: this.paytr.enabled };
  }

  @Post('paytr/start')
  async start(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: StartPaytrDto,
    @Req() req: Request,
  ) {
    const order = await this.orders.findOne({
      where: { id: dto.orderId },
      relations: { items: true },
    });
    if (!order) throw new NotFoundException('Sipariş bulunamadı.');
    if (order.paymentMethod !== PaymentMethod.CARD) {
      throw new BadRequestException('Bu sipariş kart ödemeli değil.');
    }
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Bu siparişin ödemesi zaten alınmış.');
    }
    if (!order.paytrMerchantOid) {
      throw new BadRequestException('Sipariş ödeme referansı eksik.');
    }

    const site = this.config.get<string>('PUBLIC_SITE_URL') ?? 'http://localhost:3000';
    // trust proxy acik; ::ffff: onekli IPv4'u temizle
    const userIp = (req.ip ?? '127.0.0.1').replace(/^::ffff:/, '');

    const html = await this.paytr.startPayment({
      merchantOid: order.paytrMerchantOid,
      email: order.email,
      amount: order.grandTotal,
      userIp,
      userName: order.shippingName,
      userAddress: `${order.shippingAddress} ${order.shippingDistrict}/${order.shippingCity}`,
      userPhone: order.shippingPhone,
      basket: order.items.map(
        (i) => [i.name, i.unitPrice.toFixed(2), i.quantity] as [string, string, number],
      ),
      okUrl: `${site}/siparis-basarili?paytr=1`,
      failUrl: `${site}/odeme?payment=failed&orderNo=${order.orderNo}`,
      card: {
        cardHolder: dto.cardHolder,
        cardNumber: dto.cardNumber,
        expiryMonth: dto.expiryMonth,
        expiryYear: dto.expiryYear,
        cvv: dto.cvv,
      },
    });

    this.logs.record({
      userId: order.userId,
      email: order.email,
      actorType: 'CUSTOMER',
      action: 'payment.start',
      detail: `${order.orderNo} — 3D ödeme başlatıldı`,
    });

    return { html };
  }

  /** PayTR sunucu-sunucu bildirimi. Her kosulda duz "OK" bekler. */
  @Post('paytr/callback')
  async callback(@Body() body: Record<string, string>) {
    if (!this.paytr.verifyCallback(body)) {
      throw new BadRequestException('Geçersiz imza.');
    }
    const order = await this.orders.findOne({
      where: { paytrMerchantOid: body.merchant_oid },
    });
    // Bilinmeyen bildirim: OK donulur ki PayTR tekrar tekrar denemesin.
    if (!order) return 'OK';
    if (order.paymentStatus === PaymentStatus.PAID) return 'OK';

    if (body.status === 'success') {
      await this.ordersService.setPaymentStatus(order.id, PaymentStatus.PAID);
      this.logs.record({
        userId: null,
        email: order.email,
        actorType: 'GUEST',
        action: 'payment.success',
        detail: `${order.orderNo} — PayTR ödemesi onaylandı (${body.total_amount})`,
      });
    } else {
      await this.ordersService.setPaymentStatus(order.id, PaymentStatus.FAILED);
      this.logs.record({
        userId: null,
        email: order.email,
        actorType: 'GUEST',
        action: 'payment.failed',
        detail: `${order.orderNo} — PayTR ödemesi başarısız (${body.failed_reason_msg ?? '-'})`,
      });
    }
    return 'OK';
  }
}
```

`backend/src/payments/payments.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../entities';
import { OrdersModule } from '../orders/orders.module';
import { PaytrService } from './paytr.service';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), OrdersModule],
  providers: [PaytrService],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
```

`orders.module.ts`'e `exports: [OrdersService],` ekle (providers satırının altına).
`app.module.ts`: `import { PaymentsModule } from './payments/payments.module';` ve imports dizisine `ReturnsModule`'dan sonra `PaymentsModule` ekle.

- [ ] **Step 4: PASS doğrula + build**

Run: `cd backend && npx jest payments && npm run build`
Expected: tüm payments testleri PASS, build temiz.

- [ ] **Step 5: Commit**

```bash
git add backend/src/payments backend/src/orders/orders.module.ts backend/src/app.module.ts
git commit -m "feat(payments): PayTR config/start/callback uclari ve modul kaydi"
```

---

### Task 4: Frontend — checkout'ta kart ödemesi (Trendyol tarzı akış)

**Files:**
- Modify: `frontend/app/(site)/odeme/page.tsx`
- Modify: `frontend/app/(site)/siparis-basarili/page.tsx`

**Interfaces:**
- Consumes: `GET /payments/config` → `{ cardEnabled }`; `POST /orders` cevabındaki `id`; `POST /payments/paytr/start` → `{ html }` (Task 3).
- Produces: PayTR `ok_url` → `/siparis-basarili?paytr=1`, `fail_url` → `/odeme?payment=failed&orderNo=...` sayfa davranışları.

- [ ] **Step 1: Kart durumu ve form state'i ekle**

`odeme/page.tsx` içinde `const [payMethod, setPayMethod] = ...` satırının altına:

```tsx
  const [cardEnabled, setCardEnabled] = useState(false)
  const [card, setCard] = useState({ holder: "", number: "", month: "", year: "", cvv: "" })
```

Settings'i çeken `useEffect`'in altına yeni bir effect:

```tsx
  useEffect(() => {
    api<{ cardEnabled: boolean }>("/payments/config", { auth: false })
      .then((c) => setCardEnabled(c.cardEnabled))
      .catch(() => {})
    // 3D'den basarisiz donus: fail_url buraya ?payment=failed ile getirir
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("payment") === "failed") {
        toast.error("Kart ödemesi tamamlanamadı. Bilgilerinizi kontrol edip tekrar deneyin.")
        window.history.replaceState(null, "", "/odeme")
      }
    }
  }, [])
```

- [ ] **Step 2: "Çok Yakında" bloğunu gerçek seçenekle değiştir**

Mevcut `<div className="flex items-start gap-4 rounded-md border border-dashed ... opacity-60">...` bloğunu (Kredi Kartı / Çok Yakında) şununla değiştir:

```tsx
              {cardEnabled ? (
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-4 rounded-md border p-4 transition-colors",
                    payMethod === "CARD"
                      ? "border-accent bg-secondary/50"
                      : "border-border hover:border-accent/50",
                  )}
                >
                  <input
                    type="radio"
                    name="pay"
                    checked={payMethod === "CARD"}
                    onChange={() => setPayMethod("CARD")}
                    className="mt-1 accent-[oklch(0.63_0.065_75)]"
                  />
                  <CreditCard className="mt-0.5 h-5 w-5 text-accent" />
                  <div className="w-full">
                    <p className="text-sm font-semibold">Kredi / Banka Kartı</p>
                    <p className="text-xs text-muted-foreground">
                      3D Secure ile güvenli ödeme. Kart bilgileriniz saklanmaz.
                    </p>
                    {payMethod === "CARD" && (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label className="mb-1.5 block text-xs font-semibold">Kart Üzerindeki İsim *</label>
                          <input
                            required
                            value={card.holder}
                            onChange={(e) => setCard({ ...card, holder: sanitizeName(e.target.value) })}
                            className={input}
                            autoComplete="cc-name"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="mb-1.5 block text-xs font-semibold">Kart Numarası *</label>
                          <input
                            required
                            inputMode="numeric"
                            autoComplete="cc-number"
                            maxLength={19}
                            value={card.number.replace(/(\d{4})(?=\d)/g, "$1 ")}
                            onChange={(e) =>
                              setCard({ ...card, number: e.target.value.replace(/\D/g, "").slice(0, 16) })
                            }
                            className={`${input} font-mono`}
                            placeholder="0000 0000 0000 0000"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold">Ay *</label>
                            <input
                              required
                              inputMode="numeric"
                              maxLength={2}
                              value={card.month}
                              onChange={(e) => setCard({ ...card, month: e.target.value.replace(/\D/g, "") })}
                              className={`${input} font-mono`}
                              placeholder="AA"
                            />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-semibold">Yıl *</label>
                            <input
                              required
                              inputMode="numeric"
                              maxLength={2}
                              value={card.year}
                              onChange={(e) => setCard({ ...card, year: e.target.value.replace(/\D/g, "") })}
                              className={`${input} font-mono`}
                              placeholder="YY"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold">CVV *</label>
                          <input
                            required
                            inputMode="numeric"
                            autoComplete="cc-csc"
                            maxLength={4}
                            value={card.cvv}
                            onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "") })}
                            className={`${input} font-mono`}
                            placeholder="123"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              ) : (
                <div className="flex items-start gap-4 rounded-md border border-dashed border-border p-4 opacity-60">
                  <CreditCard className="mt-0.5 h-5 w-5" />
                  <div>
                    <p className="text-sm font-semibold">
                      Kredi Kartı{" "}
                      <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Çok Yakında
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Güvenli kart ödemesi kısa süre içinde aktif olacak.
                    </p>
                  </div>
                </div>
              )}
```

- [ ] **Step 3: Submit akışına kart yolunu ekle**

`submit` fonksiyonunda, telefon kontrolünün altına kart doğrulaması:

```tsx
    if (payMethod === "CARD") {
      if (card.number.length < 15 || !card.holder.trim() || card.month.length !== 2 || card.year.length !== 2 || card.cvv.length < 3) {
        toast.error("Kart bilgilerini eksiksiz doldurun.")
        return
      }
    }
```

`api<...>("/orders", ...)` çağrısının generic tipine `id: string` ekle (`orderNo` üstüne `id: string`). Ardından mevcut şu bloğu:

```tsx
      completedRef.current = true
      sessionStorage.setItem(
        "miamiss_last_order",
        JSON.stringify({ ...res, email: form.email }),
      )
      clear()
      router.push("/siparis-basarili")
```

şununla değiştir:

```tsx
      completedRef.current = true
      sessionStorage.setItem(
        "miamiss_last_order",
        JSON.stringify({ ...res, email: form.email }),
      )
      if (payMethod === "CARD") {
        // 3D HTML'i tam sayfa yazilir; banka dogrulamasi sonrasi PayTR
        // ok_url/fail_url ile geri yonlendirir. Sepet basarida temizlenir.
        const { html } = await api<{ html: string }>("/payments/paytr/start", {
          method: "POST",
          auth: false,
          body: JSON.stringify({
            orderId: res.id,
            cardHolder: card.holder.trim(),
            cardNumber: card.number,
            expiryMonth: card.month.padStart(2, "0"),
            expiryYear: card.year,
            cvv: card.cvv,
          }),
        })
        document.open()
        document.write(html)
        document.close()
        return
      }
      clear()
      router.push("/siparis-basarili")
```

Catch bloğundaki genel hata mesajı aynı kalır (ödeme başlatma hatası da oraya düşer; sipariş PENDING kalır, kullanıcı tekrar deneyebilir — tekrar denemede yeni sipariş oluşur, eski PENDING sipariş mevcut iptal akışlarıyla temizlenebilir).

- [ ] **Step 4: siparis-basarili sayfasında karttan dönüşte sepeti temizle**

`siparis-basarili/page.tsx`'te `useCart`'tan `clear` alınır (sayfada yoksa `import { useCart } from "@/components/providers"` eklenir) ve bir effect eklenir:

```tsx
  const { clear } = useCart()
  useEffect(() => {
    if (typeof window === "undefined") return
    if (new URLSearchParams(window.location.search).get("paytr") === "1") {
      clear()
      window.history.replaceState(null, "", "/siparis-basarili")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
```

(Sayfanın mevcut yapısına uydur: zaten `"use client"` ve sessionStorage'dan `miamiss_last_order` okuyor; kart akışında bu kayıt 3D'ye gitmeden önce yazıldığı için sayfa aynen çalışır.)

- [ ] **Step 5: Build doğrula**

Run: `cd frontend && npm run build`
Expected: build temiz.

- [ ] **Step 6: Commit**

```bash
git add "frontend/app/(site)/odeme/page.tsx" "frontend/app/(site)/siparis-basarili/page.tsx"
git commit -m "feat(checkout): PayTR 3D Secure kart odemesi — form, 3D render, donus akislari"
```

---

### Task 5: Ayarlar — gönderici adresi + varsayılan desi

**Files:**
- Modify: `backend/src/settings/settings.service.ts` (StoreSettings interface + DEFAULT_SETTINGS)
- Modify: `frontend/lib/api.ts` (StoreSettings tipi, ~satır 288)
- Modify: `frontend/app/admin/ayarlar/page.tsx` (yeni bölüm)

**Interfaces:**
- Produces: `StoreSettings`'e eklenen alanlar — `senderName: string`, `senderPhone: string`, `senderEmail: string`, `senderCity: string`, `senderDistrict: string`, `senderAddress: string`, `senderZip: string`, `defaultDesi: number`. Task 6-7 gönderici adresini buradan okur.

- [ ] **Step 1: Backend interface + defaults**

`settings.service.ts` `StoreSettings` interface'ine (desiPrices'tan önce):

```ts
  /* Geliver gonderici (kargo cikis) bilgileri */
  senderName: string;
  senderPhone: string;
  senderEmail: string;
  senderCity: string;
  senderDistrict: string;
  senderAddress: string;
  senderZip: string;
  /** Otomatik gonderide kullanilacak varsayilan desi */
  defaultDesi: number;
```

`DEFAULT_SETTINGS`'e:

```ts
  senderName: 'Miamisu Home',
  senderPhone: '',
  senderEmail: 'info@miamisuhome.com',
  senderCity: '',
  senderDistrict: '',
  senderAddress: '',
  senderZip: '',
  defaultDesi: 2,
```

- [ ] **Step 2: Frontend tipi güncelle**

`frontend/lib/api.ts` içindeki `StoreSettings` interface'ine aynı 8 alanı ekle (`senderName: string` ... `defaultDesi: number`).

- [ ] **Step 3: Admin ayarlar sayfasına bölüm ekle**

`ayarlar/page.tsx`'te banka bilgileri bölümünün altına, mevcut bölümlerle aynı markup kalıbıyla yeni bir kart ekle (mevcut `set("...")` helper'ı ve `input` class'ı kullanılır):

```tsx
          {/* Kargo gonderici (Geliver) */}
          <section className="rounded-md border border-border bg-card p-6">
            <h2 className="font-display text-2xl">Kargo Göndericisi (Geliver)</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Kargo gönderileri bu adresten çıkar. Geliver entegrasyonu için doldurun.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Gönderici Adı</label>
                <input value={settings.senderName} onChange={set("senderName")} className={input} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Telefon</label>
                <input value={settings.senderPhone} onChange={set("senderPhone")} className={input} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">E-posta</label>
                <input value={settings.senderEmail} onChange={set("senderEmail")} className={input} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">İl</label>
                <input value={settings.senderCity} onChange={set("senderCity")} className={input} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">İlçe</label>
                <input value={settings.senderDistrict} onChange={set("senderDistrict")} className={input} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Posta Kodu</label>
                <input value={settings.senderZip} onChange={set("senderZip")} className={input} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold">Açık Adres</label>
                <input value={settings.senderAddress} onChange={set("senderAddress")} className={input} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold">Varsayılan Desi</label>
                <input
                  inputMode="numeric"
                  value={settings.defaultDesi}
                  onChange={set("defaultDesi")}
                  className={input}
                />
              </div>
            </div>
          </section>
```

`save()` içindeki gövdeye (shippingFee/codFee parse edilen yere) şunu ekle: `defaultDesi: parseInt(String(settings.defaultDesi), 10) || 1,`

Not: `set()` helper'ı string değer atar; `defaultDesi` sayıya save sırasında çevrilir. Sayfadaki `settings` tipi `StoreSettings` olduğu için build uyarısı çıkarsa state tipini `Record<string, unknown>`'a genişletmek yerine `value={String(settings.defaultDesi)}` kullan.

- [ ] **Step 4: Build doğrula**

Run: `cd backend && npm run build && cd ../frontend && npm run build`
Expected: iki build de temiz.

- [ ] **Step 5: Commit**

```bash
git add backend/src/settings/settings.service.ts frontend/lib/api.ts frontend/app/admin/ayarlar/page.tsx
git commit -m "feat(settings): Geliver gonderici adresi ve varsayilan desi ayarlari"
```

---

### Task 6: GeliverService — API istemcisi + durum eşleme

**Files:**
- Create: `backend/src/shipping/geliver.service.ts`
- Create: `backend/src/shipping/geliver.service.spec.ts`

**Interfaces:**
- Consumes: `ConfigService` (`GELIVER_API_TOKEN`).
- Produces (Task 7 bunları kullanır):
  - `GeliverService.enabled: boolean`
  - `GeliverService.createShipment(input: GeliverShipmentInput): Promise<GeliverShipmentResult>`
  - `GeliverService.listOffers(input: GeliverShipmentInput): Promise<GeliverOffer[]>`
  - `GeliverService.acceptOffer(offerId: string): Promise<GeliverShipmentResult>`
  - `GeliverService.cancelShipment(shipmentId: string): Promise<void>`
  - `GeliverService.mapTrackingStatus(status: string): OrderStatus | null`

**ZORUNLU ÖN ADIM:** Geliver API'sinin uç ve alan adları uygulamadan önce resmi dokümandan teyit edilir: WebFetch ile `https://docs.geliver.io` (ve API referans alt sayfaları) okunur. Aşağıdaki istemci kodu dokümandaki gerçek uç adları/gövde şemasıyla uyuşmuyorsa **doküman esas alınarak** `ENDPOINTS` sabiti ve gövde kurucuları güncellenir; testler davranışı (auth başlığı, adres alanlarının taşınması, durum eşleme) doğruladığı için küçük şema değişikliklerinde aynen geçmeye devam etmelidir.

- [ ] **Step 1: Geliver dokümanını doğrula**

WebFetch: `https://docs.geliver.io` — "create shipment", "offers", "cancel", "webhook" uçlarının yol/gövde/yanıt şemalarını not al. Aşağıdaki kodu gerekiyorsa bu şemalara uyarl.

- [ ] **Step 2: Başarısız testleri yaz**

`backend/src/shipping/geliver.service.spec.ts`:

```ts
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '../entities';
import { GeliverService } from './geliver.service';

const makeConfig = (env: Record<string, string>) =>
  ({ get: (k: string) => env[k] } as unknown as ConfigService);

const ornekInput = () => ({
  orderNo: 'MIA-1',
  recipient: {
    name: 'Ali Veli',
    phone: '05551112233',
    email: 'a@b.com',
    city: 'İstanbul',
    district: 'Kadıköy',
    address: 'Test Mah. No:1',
    zip: '34000',
  },
  sender: {
    name: 'Miamisu Home',
    phone: '05550001122',
    email: 'info@miamisuhome.com',
    city: 'İzmir',
    district: 'Bornova',
    address: 'Depo Mah. No:2',
    zip: '35000',
  },
  desi: 2,
});

describe('GeliverService', () => {
  it('token yoksa enabled=false, cagrilar hata firlatir', async () => {
    const svc = new GeliverService(makeConfig({}));
    expect(svc.enabled).toBe(false);
    await expect(svc.listOffers(ornekInput())).rejects.toThrow('Geliver yapılandırılmamış');
  });

  it('istekler bearer token ve alici bilgisiyle gider', async () => {
    const svc = new GeliverService(makeConfig({ GELIVER_API_TOKEN: 'tok123' }));
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'shp1', offers: [] } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    await svc.listOffers(ornekInput());
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('api.geliver.io');
    expect(init.headers.Authorization).toBe('Bearer tok123');
    expect(String(init.body)).toContain('Ali Veli');
  });

  it('API hata donerse mesaj BadRequest olarak yukselir', async () => {
    const svc = new GeliverService(makeConfig({ GELIVER_API_TOKEN: 'tok123' }));
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ message: 'Adres eksik' }),
    }) as unknown as typeof fetch;
    await expect(svc.listOffers(ornekInput())).rejects.toThrow('Adres eksik');
  });

  it('takip durumlarini siparis durumuna esler', () => {
    const svc = new GeliverService(makeConfig({ GELIVER_API_TOKEN: 't' }));
    expect(svc.mapTrackingStatus('DELIVERED')).toBe(OrderStatus.DELIVERED);
    expect(svc.mapTrackingStatus('delivered')).toBe(OrderStatus.DELIVERED);
    expect(svc.mapTrackingStatus('IN_TRANSIT')).toBe(OrderStatus.SHIPPED);
    expect(svc.mapTrackingStatus('picked_up')).toBe(OrderStatus.SHIPPED);
    expect(svc.mapTrackingStatus('label_created')).toBeNull();
    expect(svc.mapTrackingStatus('bilinmeyen')).toBeNull();
  });
});
```

- [ ] **Step 3: FAIL doğrula**

Run: `cd backend && npx jest shipping/geliver.service.spec.ts`
Expected: FAIL — "Cannot find module './geliver.service'"

- [ ] **Step 4: Servisi yaz**

`backend/src/shipping/geliver.service.ts` (uç adlarını Step 1'deki doküman teyidine göre gerekirse düzelt):

```ts
import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '../entities';

export interface GeliverParty {
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
  recipient: GeliverParty;
  sender: GeliverParty;
  desi: number;
}

export interface GeliverOffer {
  id: string;
  carrier: string;
  service: string;
  amount: number;
  currency: string;
}

export interface GeliverShipmentResult {
  shipmentId: string;
  trackingNo: string | null;
  carrier: string | null;
  labelUrl: string | null;
}

const BASE_URL = 'https://api.geliver.io/api/v1';

// Uc adlari docs.geliver.io'dan teyit edildi/duzeltildi (Task 6 Step 1).
const ENDPOINTS = {
  createShipment: '/shipments',
  acceptOffer: (offerId: string) => `/offers/${offerId}/accept`,
  cancelShipment: (id: string) => `/shipments/${id}/cancel`,
};

@Injectable()
export class GeliverService {
  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return Boolean(this.config.get('GELIVER_API_TOKEN'));
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
      message?: string;
      error?: string;
      data?: T;
    };
    if (!res.ok) {
      throw new BadRequestException(
        json.message ?? json.error ?? `Geliver isteği başarısız (${res.status}).`,
      );
    }
    return (json.data ?? (json as unknown)) as T;
  }

  private shipmentBody(input: GeliverShipmentInput) {
    const party = (p: GeliverParty) => ({
      name: p.name,
      phone: p.phone,
      email: p.email,
      cityName: p.city,
      districtName: p.district,
      address: p.address,
      zip: p.zip,
      countryCode: 'TR',
    });
    return {
      order: { sourceCode: input.orderNo },
      recipientAddress: party(input.recipient),
      senderAddress: party(input.sender),
      // Desi tek olcu olarak tasinir; Geliver desi/agirliktan buyugunu baz alir.
      length: 1,
      width: 1,
      height: 1,
      distanceUnit: 'cm',
      weight: input.desi,
      massUnit: 'kg',
    };
  }

  /** Gonderiyi olusturmadan teklifleri getirir. */
  async listOffers(input: GeliverShipmentInput): Promise<GeliverOffer[]> {
    const data = await this.request<{
      id: string;
      offers?: { id: string; providerCode?: string; providerServiceCode?: string; totalAmount?: string | number; currency?: string }[];
    }>(ENDPOINTS.createShipment, { ...this.shipmentBody(input), offersOnly: true });
    return (data.offers ?? []).map((o) => ({
      id: o.id,
      carrier: o.providerCode ?? '-',
      service: o.providerServiceCode ?? '-',
      amount: Number(o.totalAmount ?? 0),
      currency: o.currency ?? 'TRY',
    }));
  }

  /** Teklif kimligi verilirse onu, verilmezse en ucuz teklifi satin alir. */
  async createShipment(
    input: GeliverShipmentInput,
    offerId?: string,
  ): Promise<GeliverShipmentResult> {
    if (offerId) return this.acceptOffer(offerId);
    const data = await this.request<{
      id: string;
      trackingNumber?: string;
      providerCode?: string;
      labelURL?: string;
      offers?: { id: string; totalAmount?: string | number }[];
    }>(ENDPOINTS.createShipment, { ...this.shipmentBody(input), cheapest: true });
    if (data.trackingNumber) {
      return {
        shipmentId: data.id,
        trackingNo: data.trackingNumber ?? null,
        carrier: data.providerCode ?? null,
        labelUrl: data.labelURL ?? null,
      };
    }
    // Yanit tekliflerle dondugunde en ucuzu kabul et.
    const cheapest = [...(data.offers ?? [])].sort(
      (a, b) => Number(a.totalAmount ?? 0) - Number(b.totalAmount ?? 0),
    )[0];
    if (!cheapest) throw new BadRequestException('Bu adres için kargo teklifi bulunamadı.');
    return this.acceptOffer(cheapest.id);
  }

  async acceptOffer(offerId: string): Promise<GeliverShipmentResult> {
    const data = await this.request<{
      id: string;
      shipmentID?: string;
      trackingNumber?: string;
      providerCode?: string;
      labelURL?: string;
    }>(ENDPOINTS.acceptOffer(offerId), {});
    return {
      shipmentId: data.shipmentID ?? data.id,
      trackingNo: data.trackingNumber ?? null,
      carrier: data.providerCode ?? null,
      labelUrl: data.labelURL ?? null,
    };
  }

  async cancelShipment(shipmentId: string): Promise<void> {
    await this.request(ENDPOINTS.cancelShipment(shipmentId), {});
  }

  /** Geliver takip durumunu siparis durumuna cevirir; eslesme yoksa null. */
  mapTrackingStatus(status: string): OrderStatus | null {
    const s = status.toLowerCase();
    if (s.includes('deliver')) return OrderStatus.DELIVERED;
    if (
      s.includes('transit') ||
      s.includes('picked') ||
      s.includes('accepted') ||
      s.includes('shipped') ||
      s.includes('out_for')
    ) {
      return OrderStatus.SHIPPED;
    }
    return null;
  }
}
```

- [ ] **Step 5: PASS doğrula**

Run: `cd backend && npx jest shipping/geliver.service.spec.ts`
Expected: PASS (4 test)

- [ ] **Step 6: Commit**

```bash
git add backend/src/shipping
git commit -m "feat(shipping): Geliver API istemcisi ve takip durumu eslemesi"
```

---

### Task 7: ShippingService + admin uçları + webhook + otomatik oluşturma

**Files:**
- Create: `backend/src/shipping/shipping.service.ts`
- Create: `backend/src/shipping/shipping.service.spec.ts`
- Create: `backend/src/shipping/shipping.controller.ts`
- Create: `backend/src/shipping/shipping.module.ts`
- Modify: `backend/src/orders/orders.service.ts` (setPaymentStatus + setStatus kancaları)
- Modify: `backend/src/orders/orders.module.ts` (ShippingModule import)
- Modify: `backend/src/app.module.ts` (ShippingModule import)

**Interfaces:**
- Consumes: `GeliverService` (Task 6), `SettingsService.get()` (sender alanları, Task 5), `Order` repo, `MailService.orderShipped(email, orderNo, cargoCompany, trackingNo)` (global), `LogsService` (global).
- Produces:
  - `ShippingService.autoCreateForOrder(orderId: string): Promise<void>` — hata yutmaz ama fırlatmaz; loglar.
  - `ShippingService.offersForOrder(orderId: string): Promise<GeliverOffer[]>`
  - `ShippingService.createForOrder(orderId: string, offerId?: string): Promise<Order>`
  - `ShippingService.cancelForOrder(orderId: string): Promise<Order>`
  - `ShippingService.handleWebhook(payload: Record<string, unknown>): Promise<void>`
  - HTTP: `GET /api/admin/shipping/config`, `GET /api/admin/orders/:orderId/shipping/offers`, `POST /api/admin/orders/:orderId/shipping`, `DELETE /api/admin/orders/:orderId/shipping`, `POST /api/shipping/geliver/webhook?token=...`

- [ ] **Step 1: Başarısız servis testlerini yaz**

`backend/src/shipping/shipping.service.spec.ts`:

```ts
import { OrderStatus } from '../entities';
import { ShippingService } from './shipping.service';

const ORDER = {
  id: 'o1',
  orderNo: 'MIA-1',
  email: 'a@b.com',
  status: OrderStatus.CONFIRMED,
  shippingName: 'Ali Veli',
  shippingPhone: '05551112233',
  shippingCity: 'İstanbul',
  shippingDistrict: 'Kadıköy',
  shippingAddress: 'Test Mah. No:1',
  shippingZip: '34000',
  geliverShipmentId: null as string | null,
  trackingNo: null,
  cargoCompany: null,
  statusHistory: [],
};

const SETTINGS = {
  senderName: 'Miamisu', senderPhone: '0555', senderEmail: 'i@m.com',
  senderCity: 'İzmir', senderDistrict: 'Bornova', senderAddress: 'Depo No:2',
  senderZip: '35000', defaultDesi: 2,
};

function makeService(overrides: { order?: Partial<typeof ORDER>; geliverEnabled?: boolean } = {}) {
  const order = { ...ORDER, ...overrides.order };
  const orders = {
    findOne: jest.fn().mockResolvedValue(order),
    save: jest.fn().mockImplementation((o) => Promise.resolve(o)),
  };
  const geliver = {
    enabled: overrides.geliverEnabled ?? true,
    createShipment: jest.fn().mockResolvedValue({
      shipmentId: 'shp1', trackingNo: 'TRK1', carrier: 'yurtici', labelUrl: 'http://label',
    }),
    listOffers: jest.fn().mockResolvedValue([]),
    cancelShipment: jest.fn().mockResolvedValue(undefined),
    mapTrackingStatus: jest.fn((s: string) =>
      s === 'delivered' ? OrderStatus.DELIVERED : s === 'in_transit' ? OrderStatus.SHIPPED : null,
    ),
  };
  const settings = { get: jest.fn().mockResolvedValue(SETTINGS) };
  const mail = { orderShipped: jest.fn() };
  const logs = { record: jest.fn() };
  const svc = new ShippingService(
    orders as never, geliver as never, settings as never, mail as never, logs as never,
  );
  return { svc, orders, geliver, mail, order };
}

describe('ShippingService', () => {
  it('otomatik olusturma gonderi bilgilerini siparise yazar', async () => {
    const { svc, orders, geliver } = makeService();
    await svc.autoCreateForOrder('o1');
    expect(geliver.createShipment).toHaveBeenCalled();
    const saved = orders.save.mock.calls[0][0];
    expect(saved.geliverShipmentId).toBe('shp1');
    expect(saved.trackingNo).toBe('TRK1');
    expect(saved.cargoCompany).toBe('yurtici');
    expect(saved.labelUrl).toBe('http://label');
  });

  it('geliver kapaliysa otomatik olusturma sessizce atlanir', async () => {
    const { svc, geliver } = makeService({ geliverEnabled: false });
    await expect(svc.autoCreateForOrder('o1')).resolves.toBeUndefined();
    expect(geliver.createShipment).not.toHaveBeenCalled();
  });

  it('zaten gonderisi olan siparis icin tekrar olusturulmaz', async () => {
    const { svc, geliver } = makeService({ order: { geliverShipmentId: 'eski' } });
    await svc.autoCreateForOrder('o1');
    expect(geliver.createShipment).not.toHaveBeenCalled();
  });

  it('geliver hatasi autoCreate disina sizmasin', async () => {
    const { svc, geliver } = makeService();
    geliver.createShipment.mockRejectedValue(new Error('patladi'));
    await expect(svc.autoCreateForOrder('o1')).resolves.toBeUndefined();
  });

  it('webhook teslim durumunda siparisi DELIVERED yapar', async () => {
    const { svc, orders } = makeService({
      order: { geliverShipmentId: 'shp1', status: OrderStatus.SHIPPED },
    });
    await svc.handleWebhook({ shipmentId: 'shp1', status: 'delivered' });
    const saved = orders.save.mock.calls[0][0];
    expect(saved.status).toBe(OrderStatus.DELIVERED);
  });

  it('webhook tasimada durumunda SHIPPED yapar ve kargo maili atar', async () => {
    const { svc, orders, mail } = makeService({
      order: { geliverShipmentId: 'shp1', trackingNo: 'TRK1', cargoCompany: 'yurtici' },
    });
    await svc.handleWebhook({ shipmentId: 'shp1', status: 'in_transit' });
    const saved = orders.save.mock.calls[0][0];
    expect(saved.status).toBe(OrderStatus.SHIPPED);
    expect(mail.orderShipped).toHaveBeenCalledWith('a@b.com', 'MIA-1', 'yurtici', 'TRK1');
  });

  it('webhook bilinmeyen gonderiyi yok sayar', async () => {
    const { svc, orders } = makeService();
    orders.findOne.mockResolvedValue(null);
    await expect(svc.handleWebhook({ shipmentId: 'yok', status: 'delivered' })).resolves.toBeUndefined();
    expect(orders.save).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: FAIL doğrula**

Run: `cd backend && npx jest shipping/shipping.service.spec.ts`
Expected: FAIL — "Cannot find module './shipping.service'"

- [ ] **Step 3: ShippingService'i yaz**

`backend/src/shipping/shipping.service.ts`:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../entities';
import { SettingsService } from '../settings/settings.service';
import { MailService } from '../mail/mail.service';
import { LogsService } from '../logs/logs.service';
import {
  GeliverOffer,
  GeliverService,
  GeliverShipmentInput,
} from './geliver.service';

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

  private async shipmentInput(order: Order): Promise<GeliverShipmentInput> {
    const store = await this.settings.get();
    if (!store.senderCity || !store.senderAddress) {
      throw new BadRequestException(
        'Gönderici adresi eksik. Admin > Ayarlar > Kargo Göndericisi bölümünü doldurun.',
      );
    }
    return {
      orderNo: order.orderNo,
      recipient: {
        name: order.shippingName,
        phone: order.shippingPhone,
        email: order.email,
        city: order.shippingCity,
        district: order.shippingDistrict,
        address: order.shippingAddress,
        zip: order.shippingZip ?? '',
      },
      sender: {
        name: store.senderName,
        phone: store.senderPhone,
        email: store.senderEmail,
        city: store.senderCity,
        district: store.senderDistrict,
        address: store.senderAddress,
        zip: store.senderZip,
      },
      desi: store.defaultDesi || 1,
    };
  }

  private async findOrder(orderId: string): Promise<Order> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Sipariş bulunamadı.');
    return order;
  }

  private async applyShipment(
    order: Order,
    result: { shipmentId: string; trackingNo: string | null; carrier: string | null; labelUrl: string | null },
  ): Promise<Order> {
    order.geliverShipmentId = result.shipmentId;
    order.trackingNo = result.trackingNo;
    order.cargoCompany = result.carrier;
    order.labelUrl = result.labelUrl;
    return this.orders.save(order);
  }

  /**
   * Odeme onayinda cagrilir. Kargo hatasi siparisi asla etkilemesin diye
   * hicbir kosulda disari hata firlatmaz; sonucu loglar.
   */
  async autoCreateForOrder(orderId: string): Promise<void> {
    try {
      if (!this.geliver.enabled) return;
      const order = await this.orders.findOne({ where: { id: orderId } });
      if (!order || order.geliverShipmentId || order.status === OrderStatus.CANCELLED) return;
      const result = await this.geliver.createShipment(await this.shipmentInput(order));
      await this.applyShipment(order, result);
      this.logs.record({
        userId: null,
        email: order.email,
        actorType: 'ADMIN',
        action: 'shipping.autocreate',
        detail: `${order.orderNo} — Geliver gönderisi oluşturuldu (${result.carrier ?? '-'} / ${result.trackingNo ?? '-'})`,
      });
    } catch (err) {
      this.logs.record({
        userId: null,
        email: null,
        actorType: 'ADMIN',
        action: 'shipping.autocreate.failed',
        detail: `Sipariş ${orderId} için otomatik kargo oluşturulamadı: ${err instanceof Error ? err.message : 'bilinmeyen hata'}`,
      });
    }
  }

  async offersForOrder(orderId: string): Promise<GeliverOffer[]> {
    const order = await this.findOrder(orderId);
    return this.geliver.listOffers(await this.shipmentInput(order));
  }

  async createForOrder(orderId: string, offerId?: string): Promise<Order> {
    const order = await this.findOrder(orderId);
    if (order.geliverShipmentId) {
      throw new BadRequestException('Bu sipariş için zaten bir gönderi var.');
    }
    const result = await this.geliver.createShipment(await this.shipmentInput(order), offerId);
    return this.applyShipment(order, result);
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
    return this.orders.save(order);
  }

  /** Geliver webhook'u: gonderi durumunu siparise yansitir. */
  async handleWebhook(payload: Record<string, unknown>): Promise<void> {
    const shipmentId = String(
      payload.shipmentId ?? payload.shipmentID ?? payload.id ?? '',
    );
    const status = String(payload.status ?? payload.trackingStatus ?? '');
    if (!shipmentId || !status) return;

    const order = await this.orders.findOne({ where: { geliverShipmentId: shipmentId } });
    if (!order) return;

    // Takip no sonradan atanmis olabilir
    const trackingNo = payload.trackingNumber ? String(payload.trackingNumber) : null;
    if (trackingNo && !order.trackingNo) order.trackingNo = trackingNo;

    const next = this.geliver.mapTrackingStatus(status);
    if (next && next !== order.status && order.status !== OrderStatus.CANCELLED) {
      const wasShipped = order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED;
      order.status = next;
      order.statusHistory = [
        ...(order.statusHistory ?? []),
        { status: next, at: new Date().toISOString() },
      ];
      if (next === OrderStatus.SHIPPED && !wasShipped) {
        this.mail.orderShipped(order.email, order.orderNo, order.cargoCompany, order.trackingNo);
      }
    }
    await this.orders.save(order);
  }
}
```

- [ ] **Step 4: PASS doğrula**

Run: `cd backend && npx jest shipping/shipping.service.spec.ts`
Expected: PASS (7 test)

- [ ] **Step 5: Controller + modülü yaz**

`backend/src/shipping/shipping.controller.ts`:

```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsOptional, IsString } from 'class-validator';
import { Role } from '../entities';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/guards';
import { ShippingService } from './shipping.service';

class CreateShipmentDto {
  @IsOptional()
  @IsString()
  offerId?: string;
}

@Controller('admin/orders/:orderId/shipping')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminOrderShippingController {
  constructor(private readonly shipping: ShippingService) {}

  @Get('offers')
  offers(@Param('orderId') orderId: string) {
    return this.shipping.offersForOrder(orderId);
  }

  @Post()
  create(@Param('orderId') orderId: string, @Body() dto: CreateShipmentDto) {
    return this.shipping.createForOrder(orderId, dto.offerId);
  }

  @Delete()
  cancel(@Param('orderId') orderId: string) {
    return this.shipping.cancelForOrder(orderId);
  }
}

@Controller('admin/shipping')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminShippingController {
  constructor(private readonly shipping: ShippingService) {}

  @Get('config')
  config() {
    return { enabled: this.shipping.enabled };
  }
}

@Controller('shipping')
export class ShippingWebhookController {
  constructor(
    private readonly shipping: ShippingService,
    private readonly config: ConfigService,
  ) {}

  /** Geliver panelinde webhook adresi ?token=GELIVER_WEBHOOK_SECRET ile tanimlanir. */
  @Post('geliver/webhook')
  async webhook(@Query('token') token: string, @Body() payload: Record<string, unknown>) {
    const secret = this.config.get<string>('GELIVER_WEBHOOK_SECRET');
    if (!secret || token !== secret) throw new UnauthorizedException();
    await this.shipping.handleWebhook(payload);
    return { ok: true };
  }
}
```

`backend/src/shipping/shipping.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../entities';
import { SettingsModule } from '../settings/settings.module';
import { GeliverService } from './geliver.service';
import { ShippingService } from './shipping.service';
import {
  AdminOrderShippingController,
  AdminShippingController,
  ShippingWebhookController,
} from './shipping.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), SettingsModule],
  providers: [GeliverService, ShippingService],
  controllers: [AdminOrderShippingController, AdminShippingController, ShippingWebhookController],
  exports: [ShippingService],
})
export class ShippingModule {}
```

Not: SettingsModule'un `SettingsService`'i export ettiğini kontrol et (`backend/src/settings/settings.module.ts`); OrdersModule onu import edip kullandığı için ediyor olmalı.

- [ ] **Step 6: Otomatik oluşturma kancalarını ekle**

`orders.service.ts`:

1. Import: `import { ShippingService } from '../shipping/shipping.service';`
2. Constructor'a: `private readonly shipping: ShippingService,`
3. `setPaymentStatus` içinde, `await this.orders.save(order);` satırından sonra (PAID kontrolünün başladığı yerde):

```ts
    // Odeme onaylaninca kargo gonderisini otomatik olustur (hata siparisi etkilemez)
    if (status === PaymentStatus.PAID) {
      void this.shipping.autoCreateForOrder(order.id);
    }
```

4. `setStatus` içinde, `await this.orders.save(order);` satırından sonra:

```ts
    // Kapida odemede gonderi, siparis onaylandiginda olusturulur
    if (status === OrderStatus.CONFIRMED && order.paymentMethod === PaymentMethod.COD) {
      void this.shipping.autoCreateForOrder(order.id);
    }
```

5. `orders.module.ts` imports'una `ShippingModule` ekle (`import { ShippingModule } from '../shipping/shipping.module';`).
6. `app.module.ts` imports'una `ShippingModule` ekle.

Döngü kontrolü: ShippingModule, OrdersModule'u import etmez (Order repo'yu kendi forFeature'ıyla alır) — döngü yok.

- [ ] **Step 7: Tüm testler + build**

Run: `cd backend && npx jest && npm run build`
Expected: tüm testler PASS, build temiz.

- [ ] **Step 8: Commit**

```bash
git add backend/src/shipping backend/src/orders backend/src/app.module.ts
git commit -m "feat(shipping): admin kargo uclari, Geliver webhook ve odeme onayinda otomatik gonderi"
```

---

### Task 8: Admin sipariş ekranına kargo paneli

**Files:**
- Create: `frontend/components/admin/shipping-panel.tsx`
- Modify: `frontend/lib/api.ts` (Order tipine `geliverShipmentId?: string | null; labelUrl?: string | null;`)
- Modify: `frontend/app/admin/siparisler/page.tsx` (OrderRow detayına panel)

**Interfaces:**
- Consumes: `GET /admin/shipping/config`, `GET /admin/orders/:id/shipping/offers`, `POST /admin/orders/:id/shipping`, `DELETE /admin/orders/:id/shipping` (Task 7).
- Produces: `<ShippingPanel order={order} onChanged={onChanged} />` bileşeni.

- [ ] **Step 1: Order tipini genişlet**

`frontend/lib/api.ts` içindeki `Order` interface'ine (`trackingNo` alanının yanına):

```ts
  geliverShipmentId?: string | null
  labelUrl?: string | null
```

- [ ] **Step 2: Paneli yaz**

`frontend/components/admin/shipping-panel.tsx`:

```tsx
"use client"

import { useEffect, useState } from "react"
import { Loader2, Package, Ticket, Truck, X } from "lucide-react"
import { toast } from "sonner"
import { api, type Order } from "@/lib/api"
import { formatPrice } from "@/lib/format"

interface Offer {
  id: string
  carrier: string
  service: string
  amount: number
  currency: string
}

/** Siparis detayinda Geliver kargo yonetimi: teklif, olusturma, etiket, iptal. */
export function ShippingPanel({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [offers, setOffers] = useState<Offer[] | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ enabled: boolean }>("/admin/shipping/config")
      .then((c) => setEnabled(c.enabled))
      .catch(() => setEnabled(false))
  }, [])

  if (enabled === null) return null
  if (!enabled) {
    return (
      <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
        Geliver entegrasyonu yapılandırılmamış (GELIVER_API_TOKEN). Takip numarasını
        aşağıdan elle girebilirsiniz.
      </p>
    )
  }

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true)
    try {
      await fn()
      toast.success(okMsg)
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "İşlem başarısız")
    } finally {
      setBusy(false)
    }
  }

  const loadOffers = async () => {
    setBusy(true)
    try {
      setOffers(await api<Offer[]>(`/admin/orders/${order.id}/shipping/offers`))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Teklifler alınamadı")
    } finally {
      setBusy(false)
    }
  }

  if (order.geliverShipmentId) {
    return (
      <div className="space-y-2 rounded-md border border-border p-3 text-xs">
        <p className="flex items-center gap-1.5 font-semibold">
          <Truck className="h-3.5 w-3.5 text-accent" /> Geliver gönderisi oluşturuldu
        </p>
        <p className="text-muted-foreground">
          {order.cargoCompany ?? "-"} · Takip: {order.trackingNo ?? "bekleniyor"}
        </p>
        <div className="flex gap-2 pt-1">
          {order.labelUrl && (
            <a
              href={order.labelUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-primary px-3 py-1.5 font-semibold transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              Etiketi Aç
            </a>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(
                () => api(`/admin/orders/${order.id}/shipping`, { method: "DELETE" }),
                "Gönderi iptal edildi",
              )
            }
            className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 font-semibold text-destructive transition-colors hover:border-destructive disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
            İptal Et
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-3 text-xs">
      <p className="flex items-center gap-1.5 font-semibold">
        <Package className="h-3.5 w-3.5 text-accent" /> Geliver Kargo
      </p>
      {offers === null ? (
        <button
          type="button"
          disabled={busy}
          onClick={loadOffers}
          className="flex items-center gap-1.5 rounded-md border border-primary px-3 py-1.5 font-semibold transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
        >
          {busy && <Loader2 className="h-3 w-3 animate-spin" />}
          Teklifleri Getir
        </button>
      ) : offers.length === 0 ? (
        <p className="text-muted-foreground">Bu adres için teklif bulunamadı.</p>
      ) : (
        <ul className="space-y-1.5">
          {offers.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">
                <Ticket className="mr-1 inline h-3 w-3" />
                {o.carrier} {o.service !== "-" ? `· ${o.service}` : ""} — {formatPrice(o.amount)}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(
                    () =>
                      api(`/admin/orders/${order.id}/shipping`, {
                        method: "POST",
                        body: JSON.stringify({ offerId: o.id }),
                      }),
                    "Gönderi oluşturuldu",
                  )
                }
                className="shrink-0 rounded-md border border-primary px-2.5 py-1 font-semibold transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
              >
                Oluştur
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          run(
            () => api(`/admin/orders/${order.id}/shipping`, { method: "POST", body: JSON.stringify({}) }),
            "En uygun taşıyıcıyla gönderi oluşturuldu",
          )
        }
        className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-semibold text-primary-foreground transition-colors hover:bg-accent disabled:opacity-50"
      >
        {busy && <Loader2 className="h-3 w-3 animate-spin" />}
        En Uygun Fiyatla Oluştur
      </button>
    </div>
  )
}
```

- [ ] **Step 3: OrderRow detayına yerleştir**

`frontend/app/admin/siparisler/page.tsx`:

1. Import: `import { ShippingPanel } from "@/components/admin/shipping-panel"`
2. OrderRow'un açılır detayındaki sağ sütunda (satır ~260 civarı, takip no / kargo firması inputlarının bulunduğu bloğun HEMEN ÜSTÜNE):

```tsx
              <ShippingPanel order={order} onChanged={onChanged} />
```

(Sağ sütunun grid yapısını bozmadan, mevcut elle takip girişi yedek olarak altta kalır.)

- [ ] **Step 4: Build doğrula**

Run: `cd frontend && npm run build`
Expected: build temiz.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/admin/shipping-panel.tsx frontend/lib/api.ts frontend/app/admin/siparisler/page.tsx
git commit -m "feat(admin): siparis detayina Geliver kargo paneli"
```

---

### Task 9: Uçtan uca doğrulama + son kontrol

**Files:**
- Modify: yok (doğrulama + gerekirse küçük düzeltmeler)

- [ ] **Step 1: Tüm backend testleri ve iki build**

Run:
```bash
cd backend && npx jest && npm run build && cd ../frontend && npm run build
```
Expected: hepsi temiz.

- [ ] **Step 2: Anahtarsız duman testi**

`.env`'de PayTR/Geliver anahtarları YOKKEN backend'i başlat (`npm run start:dev`) ve doğrula:
- `curl http://localhost:4000/api/payments/config` → `{"cardEnabled":false}`
- Frontend checkout'ta kart seçeneği "Çok Yakında" olarak görünür.
- Admin sipariş detayında kargo paneli "yapılandırılmamış" notu gösterir; elle takip girişi çalışır.
- Havale ile sipariş verme akışı uçtan uca eskisi gibi çalışır.

- [ ] **Step 3: Kullanıcıya canlıya geçiş talimatını raporla**

Rapor içeriği (kullanıcı `.env`'i kendisi doldacak):
1. `backend/.env` içine PayTR mağaza paneli > Bilgi sayfasındaki `merchant_id/key/salt` + `PAYTR_TEST_MODE=1` yazılır; PayTR panelinde **Direct API izni** açtırılır (destek talebiyle) ve **Bildirim URL'i** `https://api.miamisuhome.com/api/payments/paytr/callback` olarak tanımlanır.
2. PayTR test kartıyla (dokümandaki 4355 08.. serisi) uçtan uca deneme; başarılıysa `PAYTR_TEST_MODE=0`.
3. Geliver panelinden API token alınır → `GELIVER_API_TOKEN`; webhook adresi `https://api.miamisuhome.com/api/shipping/geliver/webhook?token=<GELIVER_WEBHOOK_SECRET>` olarak tanımlanır (secret'ı kendisi belirler).
4. Admin > Ayarlar > Kargo Göndericisi doldurulur.

- [ ] **Step 4: Son commit + push (kullanıcı onayıyla)**

```bash
git add -A && git status
# temizse:
git push origin main
```

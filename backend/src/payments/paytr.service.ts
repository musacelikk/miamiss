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

// Direct API uc adresi (secure.paytr.com DNS'te yok — canlida dogrulandi)
const PAYTR_URL = 'https://www.paytr.com/odeme';

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

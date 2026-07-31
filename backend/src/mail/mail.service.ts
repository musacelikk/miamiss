import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * SMTP_* env degiskenleri doluysa gercek e-posta gonderir,
 * bos ise yalnizca loglar (gelistirme modu).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null = null;
  private readonly from: string;
  private readonly siteUrl: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    this.from =
      config.get<string>('SMTP_FROM') ?? (user ? `Miamisu Home <${user}>` : 'Miamisu Home');
    this.siteUrl = config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    if (host && user && pass) {
      const port = parseInt(config.get<string>('SMTP_PORT') ?? '587', 10);
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`E-posta: SMTP aktif (${host})`);
    } else {
      this.logger.log('E-posta: SMTP yapılandırılmadı, mailler sadece loglanacak');
    }
  }

  /** Hata firlatmaz; e-posta gonderimi siparis akisini asla bloklamaz. */
  send(to: string, subject: string, html: string): void {
    const wrapped = this.wrap(subject, html);
    if (!this.transporter) {
      this.logger.log(`[MAIL SKIP] to=${to} subject="${subject}"`);
      return;
    }
    this.transporter
      .sendMail({ from: this.from, to, subject, html: wrapped })
      .then(() => this.logger.log(`[MAIL OK] to=${to} subject="${subject}"`))
      .catch((err: Error) =>
        this.logger.error(`[MAIL FAIL] to=${to} subject="${subject}": ${err.message}`),
      );
  }

  private wrap(title: string, body: string): string {
    return `<!doctype html>
<html lang="tr"><body style="margin:0;padding:0;background:#f7f4ee;font-family:Arial,Helvetica,sans-serif;color:#2e2925;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;padding-bottom:20px;">
      <span style="font-size:26px;font-style:italic;font-family:Georgia,serif;color:#2e2925;">miamisu</span>
      <span style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#b3a898;"> home</span>
    </div>
    <div style="background:#ffffff;border:1px solid #e6dfd2;border-radius:8px;padding:28px;">
      ${body}
    </div>
    <p style="text-align:center;font-size:11px;color:#9b9184;margin-top:20px;">
      Miamisu Home — Doğal Taş Ev Aksesuarları · <a href="${this.siteUrl}" style="color:#a5875c;">${this.siteUrl.replace(/^https?:\/\//, '')}</a>
    </p>
  </div>
</body></html>`;
  }

  /* ---- Hazir sablonlar ---- */

  orderCreated(order: {
    email: string;
    orderNo: string;
    grandTotal: number;
    paymentMethod: string;
    items: { name: string; quantity: number; unitPrice: number }[];
    bank?: { bankName: string; ibanName: string; iban: string } | null;
  }): void {
    const rows = order.items
      .map(
        (i) =>
          `<tr><td style="padding:6px 0;font-size:14px;">${i.name} × ${i.quantity}</td>
           <td style="padding:6px 0;font-size:14px;text-align:right;">${(i.unitPrice * i.quantity).toLocaleString('tr-TR')} ₺</td></tr>`,
      )
      .join('');
    const bankBlock =
      order.paymentMethod === 'BANK_TRANSFER' && order.bank?.iban
        ? `<div style="background:#f7f4ee;border-radius:6px;padding:16px;margin-top:16px;font-size:13px;">
             <strong>Havale / EFT Bilgileri</strong><br/>
             ${order.bank.bankName ? `Banka: ${order.bank.bankName}<br/>` : ''}
             ${order.bank.ibanName ? `Alıcı: ${order.bank.ibanName}<br/>` : ''}
             IBAN: <strong>${order.bank.iban}</strong><br/>
             Açıklamaya sipariş numaranızı (<strong>${order.orderNo}</strong>) yazmayı unutmayın.
           </div>`
        : '';
    this.send(
      order.email,
      `Siparişiniz alındı — ${order.orderNo}`,
      `<h2 style="margin:0 0 8px;font-family:Georgia,serif;">Siparişiniz Alındı 🎉</h2>
       <p style="font-size:14px;">Sipariş numaranız: <strong>${order.orderNo}</strong></p>
       <table style="width:100%;border-collapse:collapse;border-top:1px solid #eee;">${rows}</table>
       <p style="font-size:15px;text-align:right;border-top:1px solid #eee;padding-top:10px;">
         Toplam: <strong>${order.grandTotal.toLocaleString('tr-TR')} ₺</strong></p>
       ${bankBlock}
       <p style="font-size:13px;margin-top:16px;">Siparişinizi <a href="${this.siteUrl}/siparis-takip" style="color:#a5875c;">buradan takip edebilirsiniz</a>.</p>`,
    );
  }

  paymentConfirmed(email: string, orderNo: string, giftCards: { code: string; amount: number }[]): void {
    const gcBlock = giftCards.length
      ? `<div style="background:#f7f4ee;border-radius:6px;padding:16px;margin-top:16px;">
           <strong style="font-size:14px;">Hediye Kartlarınız</strong>
           ${giftCards
             .map(
               (g) =>
                 `<p style="font-size:15px;margin:8px 0 0;">
                    <span style="font-family:monospace;letter-spacing:1px;background:#fff;border:1px dashed #a5875c;padding:4px 10px;border-radius:4px;">${g.code}</span>
                    — ${g.amount.toLocaleString('tr-TR')} ₺</p>`,
             )
             .join('')}
           <p style="font-size:12px;color:#9b9184;margin-top:10px;">Kodlar ödeme adımında "Hediye Kartı ile Öde" bölümünde kullanılır, 1 yıl geçerlidir.</p>
         </div>`
      : '';
    this.send(
      email,
      `Ödemeniz onaylandı — ${orderNo}`,
      `<h2 style="margin:0 0 8px;font-family:Georgia,serif;">Ödemeniz Onaylandı ✓</h2>
       <p style="font-size:14px;"><strong>${orderNo}</strong> numaralı siparişinizin ödemesi onaylandı. En kısa sürede hazırlanıp kargoya verilecek.</p>
       ${gcBlock}`,
    );
  }

  orderShipped(email: string, orderNo: string, cargoCompany: string | null, trackingNo: string | null): void {
    this.send(
      email,
      `Siparişiniz kargoda — ${orderNo}`,
      `<h2 style="margin:0 0 8px;font-family:Georgia,serif;">Siparişiniz Yola Çıktı 📦</h2>
       <p style="font-size:14px;"><strong>${orderNo}</strong> numaralı siparişiniz kargoya verildi.</p>
       ${cargoCompany ? `<p style="font-size:14px;">Kargo: <strong>${cargoCompany}</strong></p>` : ''}
       ${trackingNo ? `<p style="font-size:14px;">Takip No: <strong style="font-family:monospace;">${trackingNo}</strong></p>` : ''}`,
    );
  }

  giftCardToRecipient(card: {
    recipientEmail: string;
    recipientName: string | null;
    code: string;
    amount: number;
    message: string | null;
  }): void {
    this.send(
      card.recipientEmail,
      'Size bir Miamisu Home hediye kartı gönderildi 🎁',
      `<h2 style="margin:0 0 8px;font-family:Georgia,serif;">Bir Hediyeniz Var${card.recipientName ? `, ${card.recipientName}` : ''} 🎁</h2>
       ${card.message ? `<p style="font-size:14px;font-style:italic;">“${card.message}”</p>` : ''}
       <p style="font-size:15px;margin:16px 0;">
         <span style="font-family:monospace;letter-spacing:1px;background:#f7f4ee;border:1px dashed #a5875c;padding:6px 12px;border-radius:4px;">${card.code}</span>
         — <strong>${card.amount.toLocaleString('tr-TR')} ₺</strong></p>
       <p style="font-size:13px;">Kodu <a href="${this.siteUrl}" style="color:#a5875c;">miamisuhome.com</a> üzerinde ödeme adımında kullanabilirsiniz. 1 yıl geçerlidir.</p>`,
    );
  }

  stockReplenished(email: string, productName: string, slug: string): void {
    this.send(
      email,
      `${productName} tekrar stokta!`,
      `<h2 style="margin:0 0 8px;font-family:Georgia,serif;">Beklediğiniz Ürün Stokta ✨</h2>
       <p style="font-size:14px;"><strong>${productName}</strong> yeniden satışta. Tükenmeden göz atın:</p>
       <p style="margin-top:16px;"><a href="${this.siteUrl}/urunler/${slug}"
          style="background:#2e2925;color:#fff;padding:10px 22px;border-radius:4px;text-decoration:none;font-size:14px;">Ürüne Git</a></p>`,
    );
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/** Kullanici metnini e-posta HTML'ine gomerken kacisla (XSS/bozulma onlemi). */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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
    // FRONTEND_URL yanlislikla virgullu (coklu) girilse bile ilk adresi kullan
    this.siteUrl = (config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000')
      .split(',')[0]
      .trim()
      .replace(/\/$/, '');

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
      <img src="${this.siteUrl}/logo/logo.png" alt="Miamisu Home" height="64" style="height:64px;width:auto;" />
    </div>
    <div style="background:#ffffff;border:1px solid #e6dfd2;border-radius:8px;padding:28px;">
      ${body}
    </div>
    <p style="text-align:center;font-size:11px;color:#9b9184;margin-top:20px;">
      Miamisu Home — Doğal Taş Ev Aksesuarları · <a href="https://www.miamisuhome.com" style="color:#a5875c;">https://www.miamisuhome.com</a>
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
       <p style="font-size:13px;margin-top:16px;">Siparişinizi <a href="https://www.miamisuhome.com/siparis-takip" style="color:#a5875c;">buradan takip edebilirsiniz</a>.</p>`,
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
       <p style="font-size:13px;">Kodu <a href="" style="color:#a5875c;">miamisuhome.com</a> üzerinde ödeme adımında kullanabilirsiniz. 1 yıl geçerlidir.</p>`,
    );
  }

  /**
   * Kampanya e-postasi: sablon HTML'i oldugu gibi gonderilir ({{name}}
   * alici adiyla degistirilir), marka sablonuna sarilmaz.
   */
  sendMarketing(
    to: string,
    subject: string,
    html: string,
    recipientName: string,
    unsubscribeUrl?: string,
  ): void {
    let personalized = html.replace(/\{\{\s*name\s*\}\}/g, recipientName);
    // Yasal gereklilik: her kampanya mailinin altina abonelikten cikma linki
    if (unsubscribeUrl) {
      const footer = `<p style="text-align:center;font-size:11px;color:#9b9184;margin:18px auto 0;max-width:560px;font-family:Arial,sans-serif;">Bu e-postayı Miamisu Home pazarlama listesine kayıtlı olduğunuz için aldınız. <a href="${unsubscribeUrl}" style="color:#a5875c;">Abonelikten çık</a></p>`;
      personalized = personalized.includes('</body>')
        ? personalized.replace('</body>', `${footer}</body>`)
        : personalized + footer;
    }
    if (!this.transporter) {
      this.logger.log(`[MAIL SKIP] to=${to} subject="${subject}" (kampanya)`);
      return;
    }
    this.transporter
      .sendMail({ from: this.from, to, subject, html: personalized })
      .then(() => this.logger.log(`[MAIL OK] to=${to} subject="${subject}" (kampanya)`))
      .catch((err: Error) =>
        this.logger.error(`[MAIL FAIL] to=${to}: ${err.message}`),
      );
  }

  /** Destek kutusuna dusen yeni mesaji isletmeciye haber verir. */
  supportNotifyAdmin(ticket: {
    ticketNo: string;
    subject: string;
    name: string;
    email: string;
    orderNo?: string | null;
    body: string;
  }): void {
    const to = process.env.SUPPORT_EMAIL;
    if (!to) {
      this.logger.warn('SUPPORT_EMAIL tanımlı değil, destek bildirimi gönderilemedi');
      return;
    }
    const adminUrl = process.env.ADMIN_URL ?? 'https://admin.miamisuhome.com';
    this.send(
      to,
      `Yeni destek mesajı — ${ticket.ticketNo}`,
      `<h2 style="margin:0 0 8px;font-family:Georgia,serif;">Yeni Destek Mesajı</h2>
       <p style="font-size:14px;margin:0 0 4px;"><strong>${ticket.subject}</strong></p>
       <p style="font-size:13px;color:#9b9184;margin:0 0 14px;">
         ${ticket.name} · ${ticket.email}${ticket.orderNo ? ` · Sipariş: ${ticket.orderNo}` : ''}
         · Talep No: ${ticket.ticketNo}
       </p>
       <div style="background:#f7f4ee;border-radius:6px;padding:16px;font-size:14px;white-space:pre-wrap;">${escapeHtml(ticket.body)}</div>
       <p style="margin:20px 0 0;"><a href="${adminUrl}/destek"
          style="background:#2e2925;color:#fff;padding:11px 24px;border-radius:4px;text-decoration:none;font-size:14px;">Panelden Yanıtla</a></p>`,
    );
  }

  /** Isletmecinin yanitini musteriye bildirir. */
  supportReplyToCustomer(
    email: string,
    ticketNo: string,
    subject: string,
    body: string,
  ): void {
    this.send(
      email,
      `Destek talebinize yanıt — ${ticketNo}`,
      `<h2 style="margin:0 0 8px;font-family:Georgia,serif;">Talebinize Yanıt Verdik</h2>
       <p style="font-size:13px;color:#9b9184;margin:0 0 14px;">${subject} · Talep No: ${ticketNo}</p>
       <div style="background:#f7f4ee;border-radius:6px;padding:16px;font-size:14px;white-space:pre-wrap;">${escapeHtml(body)}</div>
       <p style="font-size:13px;margin-top:16px;">
         Yanıtlamak için <a href="https://www.miamisuhome.com/destek" style="color:#a5875c;">destek sayfanızı</a> ziyaret edebilirsiniz.
       </p>`,
    );
  }

  /** Yeni iade talebini isletmeciye bildirir. */
  returnNotifyAdmin(req: {
    returnNo: string;
    orderNo: string;
    email: string;
    reason: string;
    description: string;
    imageCount: number;
  }): void {
    const to = process.env.SUPPORT_EMAIL;
    if (!to) return;
    const adminUrl = process.env.ADMIN_URL ?? 'https://admin.miamisuhome.com';
    this.send(
      to,
      `Yeni iade talebi — ${req.returnNo}`,
      `<h2 style="margin:0 0 8px;font-family:Georgia,serif;">Yeni İade Talebi</h2>
       <p style="font-size:13px;color:#9b9184;margin:0 0 14px;">
         Sipariş: ${req.orderNo} · ${req.email} · ${req.imageCount} fotoğraf
       </p>
       <p style="font-size:14px;"><strong>Sebep:</strong> ${req.reason}</p>
       <div style="background:#f7f4ee;border-radius:6px;padding:16px;font-size:14px;white-space:pre-wrap;">${escapeHtml(req.description)}</div>
       <p style="margin:20px 0 0;"><a href="${adminUrl}/iadeler"
          style="background:#2e2925;color:#fff;padding:11px 24px;border-radius:4px;text-decoration:none;font-size:14px;">Panelden İncele</a></p>`,
    );
  }

  /** Iade karari musteriye bildirilir. */
  returnDecisionToCustomer(
    email: string,
    returnNo: string,
    orderNo: string,
    status: string,
    note: string | null,
  ): void {
    const statusText =
      status === 'APPROVED'
        ? 'onaylandı ✓ — kargo süreci için sizinle iletişime geçeceğiz'
        : status === 'REJECTED'
          ? 'maalesef reddedildi'
          : status === 'COMPLETED'
            ? 'tamamlandı, ücret iadeniz yapıldı'
            : 'güncellendi';
    this.send(
      email,
      `İade talebiniz ${status === 'APPROVED' ? 'onaylandı' : status === 'REJECTED' ? 'reddedildi' : 'güncellendi'} — ${returnNo}`,
      `<h2 style="margin:0 0 8px;font-family:Georgia,serif;">İade Talebiniz Hakkında</h2>
       <p style="font-size:14px;"><strong>${orderNo}</strong> siparişiniz için oluşturduğunuz
       <strong>${returnNo}</strong> numaralı iade talebiniz ${statusText}.</p>
       ${note ? `<div style="background:#f7f4ee;border-radius:6px;padding:16px;font-size:14px;margin-top:12px;white-space:pre-wrap;">${escapeHtml(note)}</div>` : ''}`,
    );
  }

  passwordResetCode(email: string, name: string, code: string): void {
    this.send(
      email,
      `Şifre sıfırlama kodunuz: ${code}`,
      `<h2 style="margin:0 0 8px;font-family:Georgia,serif;">Şifre Sıfırlama Kodunuz</h2>
       <p style="font-size:14px;">Merhaba ${name}, şifrenizi sıfırlamak için aşağıdaki kodu kullanın:</p>
       <p style="margin:22px 0;text-align:center;">
         <span style="display:inline-block;font-family:monospace;font-size:32px;font-weight:bold;letter-spacing:10px;background:#f7f4ee;border:2px dashed #a5875c;border-radius:8px;padding:14px 26px;color:#2e2925;">${code}</span>
       </p>
       <p style="font-size:12px;color:#9b9184;">Kod <strong>5 dakika</strong> geçerlidir ve yalnızca bir kez kullanılabilir.
       Bu talebi siz yapmadıysanız bu e-postayı yok sayın, şifreniz değişmez.</p>`,
    );
  }

  stockReplenished(email: string, productName: string, slug: string): void {
    this.send(
      email,
      `${productName} tekrar stokta!`,
      `<h2 style="margin:0 0 8px;font-family:Georgia,serif;">Beklediğiniz Ürün Stokta ✨</h2>
       <p style="font-size:14px;"><strong>${productName}</strong> yeniden satışta. Tükenmeden göz atın:</p>
       <p style="margin-top:16px;"><a href="https://www.miamisuhome.com/urunler/${slug}"
          style="background:#2e2925;color:#fff;padding:10px 22px;border-radius:4px;text-decoration:none;font-size:14px;">Ürüne Git</a></p>`,
    );
  }
}

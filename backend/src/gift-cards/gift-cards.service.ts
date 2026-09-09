import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { GiftCard, GiftCardStatus } from '../entities';

@Injectable()
export class GiftCardsService {
  constructor(@InjectRepository(GiftCard) private readonly cards: Repository<GiftCard>) {}

  private generateCode(): string {
    const raw = randomBytes(8).toString('hex').toUpperCase();
    return `GIFT-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
  }

  /** Odeme onayi oncesi kullanilamaz yer tutucu; GIFT- prefixi yok. */
  private generateHoldCode(): string {
    return `WAIT-${randomBytes(12).toString('hex').toUpperCase()}`;
  }

  private isIssuedCode(code: string): boolean {
    return code.startsWith('GIFT-');
  }

  /** Satin alinan hediye karti: odeme onaylanana kadar kod uretilmez, kullanilamaz. */
  async createPending(data: {
    amount: number;
    purchaserEmail: string;
    recipientName?: string;
    recipientEmail?: string;
    message?: string;
  }): Promise<GiftCard> {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    return this.cards.save(
      this.cards.create({
        code: this.generateHoldCode(),
        initialAmount: data.amount,
        balance: data.amount,
        status: GiftCardStatus.PENDING,
        purchaserEmail: data.purchaserEmail,
        recipientName: data.recipientName ?? null,
        recipientEmail: data.recipientEmail ?? null,
        message: data.message ?? null,
        expiresAt,
      }),
    );
  }

  async check(code: string): Promise<GiftCard> {
    const card = await this.cards.findOne({ where: { code: code.trim().toUpperCase() } });
    if (!card) throw new BadRequestException('Hediye kartı bulunamadı.');
    if (card.status === GiftCardStatus.PENDING || !this.isIssuedCode(card.code)) {
      throw new BadRequestException('Bu hediye kartı henüz aktifleşmedi (ödeme bekleniyor).');
    }
    if (card.status === GiftCardStatus.DISABLED) {
      throw new BadRequestException('Bu hediye kartı kullanıma kapatılmış.');
    }
    if (card.status === GiftCardStatus.DEPLETED || card.balance <= 0) {
      throw new BadRequestException('Bu hediye kartının bakiyesi tükenmiş.');
    }
    if (card.expiresAt && card.expiresAt < new Date()) {
      throw new BadRequestException('Bu hediye kartının süresi dolmuş.');
    }
    return card;
  }

  /** Bakiyeden dusum yapar, kullanilan tutari dondurur. */
  async redeem(code: string, amountNeeded: number): Promise<{ card: GiftCard; used: number }> {
    const card = await this.check(code);
    const used = Math.min(card.balance, amountNeeded);
    card.balance = Math.round((card.balance - used) * 100) / 100;
    if (card.balance <= 0) card.status = GiftCardStatus.DEPLETED;
    await this.cards.save(card);
    return { card, used };
  }

  async refund(cardId: string, amount: number) {
    const card = await this.cards.findOne({ where: { id: cardId } });
    if (!card) return;
    card.balance = Math.round((card.balance + amount) * 100) / 100;
    if (card.status === GiftCardStatus.DEPLETED && card.balance > 0) {
      card.status = GiftCardStatus.ACTIVE;
    }
    await this.cards.save(card);
  }

  /**
   * Odeme onayinda cagrilir. Yer tutucu kodu gercek GIFT koduna cevirir.
   * Zaten GIFT- kodu varsa (eski PENDING kayitlar) sadece aktiflestirir.
   * Iptal edilmis kartlari (DISABLED) odeme akisi yeniden acmaz; admin force ile acabilir.
   */
  async activate(cardId: string, opts?: { force?: boolean }): Promise<GiftCard> {
    const card = await this.cards.findOne({ where: { id: cardId } });
    if (!card) throw new BadRequestException('Hediye kartı bulunamadı.');
    if (card.status === GiftCardStatus.DEPLETED) return card;
    if (card.status === GiftCardStatus.ACTIVE && this.isIssuedCode(card.code)) return card;
    if (card.status === GiftCardStatus.DISABLED && !opts?.force) return card;
    if (!this.isIssuedCode(card.code)) {
      card.code = this.generateCode();
    }
    card.status = GiftCardStatus.ACTIVE;
    return this.cards.save(card);
  }

  /** Musteri yanitlarinda odeme onayi oncesi kodu gizler. */
  publicCode(card: { code: string; status: GiftCardStatus | string }): string {
    if (card.status === GiftCardStatus.ACTIVE || card.status === GiftCardStatus.DEPLETED) {
      return this.isIssuedCode(card.code) ? card.code : '';
    }
    return '';
  }

  hideUnissuedCodes<T extends { items?: { boughtGiftCard?: GiftCard | null }[] }>(order: T): T {
    for (const item of order.items ?? []) {
      const gc = item.boughtGiftCard;
      if (!gc) continue;
      const code = this.publicCode(gc);
      if (gc.code !== code) {
        item.boughtGiftCard = { ...gc, code } as GiftCard;
      }
    }
    return order;
  }
}

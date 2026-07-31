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

  /** Satin alinan hediye karti kaydi (odeme onaylanana kadar PENDING). */
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
        code: this.generateCode(),
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
    if (card.status === GiftCardStatus.PENDING) {
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

  async activate(cardId: string) {
    await this.cards.update({ id: cardId }, { status: GiftCardStatus.ACTIVE });
  }
}

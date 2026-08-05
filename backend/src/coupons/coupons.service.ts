import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon, CouponSource, CouponType } from '../entities';
import { randomBytes } from 'crypto';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon) private readonly coupons: Repository<Coupon>,
    private readonly settings: SettingsService,
  ) {}

  /** Kupon gecerli mi kontrol eder, indirim tutarini hesaplar. */
  async validate(code: string, subtotal: number): Promise<{ coupon: Coupon; discount: number }> {
    const coupon = await this.coupons.findOne({ where: { code: code.trim().toUpperCase() } });
    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('Kupon kodu geçersiz.');
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new BadRequestException('Kupon kodunun süresi dolmuş.');
    }
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Kupon kullanım limitine ulaşmış.');
    }
    if (coupon.minOrderTotal != null && subtotal < coupon.minOrderTotal) {
      throw new BadRequestException(
        `Bu kupon minimum ${coupon.minOrderTotal.toLocaleString('tr-TR')} TL sepet tutarında geçerlidir.`,
      );
    }
    const discount =
      coupon.type === CouponType.PERCENT
        ? Math.round(subtotal * coupon.value) / 100
        : Math.min(coupon.value, subtotal);
    return { coupon, discount: Math.round(discount * 100) / 100 };
  }

  async markUsed(couponId: string) {
    await this.coupons.increment({ id: couponId }, 'usedCount', 1);
  }

  async unmarkUsed(couponId: string) {
    await this.coupons.decrement({ id: couponId }, 'usedCount', 1);
  }

  /** Bulmaca odulu: ayarlardaki oran/sure/adet ile kupon uretir. */
  async createPuzzleReward(): Promise<Coupon> {
    const cfg = await this.settings.getPuzzle();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Math.max(1, cfg.rewardValidityDays || 7));
    // Benzersiz kod: nadir carpismada yeniden dene
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = `MIA-${randomBytes(3).toString('hex').toUpperCase()}`;
      const clash = await this.coupons.findOne({ where: { code } });
      if (clash) continue;
      return this.coupons.save(
        this.coupons.create({
          code,
          type: CouponType.PERCENT,
          value: Math.min(100, Math.max(1, cfg.rewardPercent || 10)),
          maxUses: Math.max(1, cfg.rewardMaxUses || 1),
          expiresAt,
          source: CouponSource.PUZZLE,
        }),
      );
    }
    throw new BadRequestException('Kupon kodu üretilemedi, lütfen tekrar deneyin.');
  }
}

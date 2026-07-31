import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CouponSource, CouponType } from './enums';
import { numericTransformer } from './numeric.transformer';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'enum', enum: CouponType, default: CouponType.PERCENT })
  type: CouponType;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: numericTransformer })
  value: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  minOrderTotal: number | null;

  @Column({ type: 'int', nullable: true })
  maxUses: number | null;

  @Column({ default: 0 })
  usedCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'enum', enum: CouponSource, default: CouponSource.ADMIN })
  source: CouponSource;

  @CreateDateColumn()
  createdAt: Date;
}

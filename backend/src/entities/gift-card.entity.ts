import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GiftCardStatus } from './enums';
import { numericTransformer } from './numeric.transformer';

@Entity('gift_cards')
export class GiftCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: numericTransformer })
  initialAmount: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: numericTransformer })
  balance: number;

  @Column({ type: 'enum', enum: GiftCardStatus, default: GiftCardStatus.PENDING })
  status: GiftCardStatus;

  @Column({ type: 'varchar', nullable: true })
  purchaserEmail: string | null;

  @Column({ type: 'varchar', nullable: true })
  recipientName: string | null;

  @Column({ type: 'varchar', nullable: true })
  recipientEmail: string | null;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}

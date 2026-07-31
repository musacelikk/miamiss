import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';

export enum ReturnStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
}

/** Teslim edilmis siparis icin musteri iade talebi. */
@Entity('return_requests')
export class ReturnRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ unique: true })
  returnNo: string;

  @Column()
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  order: Order;

  @Index()
  @Column()
  orderNo: string;

  @Index()
  @Column()
  email: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column()
  reason: string;

  @Column({ type: 'text', default: '' })
  description: string;

  /** Musterinin yukledigi fotograflar */
  @Column({ type: 'jsonb', default: [] })
  images: string[];

  @Index()
  @Column({ type: 'enum', enum: ReturnStatus, default: ReturnStatus.PENDING })
  status: ReturnStatus;

  /** Karar aciklamasi (musteriyle paylasilir) */
  @Column({ type: 'text', nullable: true })
  adminNote: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

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

  /*
   * Iade kargosu: talep onaylandiginda Geliver'de ters yonlu (musteri ->
   * magaza) bir gonderi olusturulur. Musteri asagidaki kodu kargo subesinde
   * soyleyerek paketi ucretsiz teslim eder.
   */

  @Column({ type: 'varchar', nullable: true })
  geliverShipmentId: string | null;

  /** Musterinin kargo subesinde verecegi iade kargo kodu */
  @Column({ type: 'varchar', nullable: true })
  trackingNo: string | null;

  @Column({ type: 'varchar', nullable: true })
  cargoCompany: string | null;

  /** Iade etiketi (PDF/barkod) adresi */
  @Column({ type: 'varchar', nullable: true })
  labelUrl: string | null;

  /**
   * Otomatik iade kargosu olusturulamadiysa sebebi. Admin panelde gosterilir;
   * gonderi olusunca temizlenir.
   */
  @Column({ type: 'text', nullable: true })
  shippingError: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

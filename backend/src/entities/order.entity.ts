import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderStatus, PaymentMethod, PaymentStatus } from './enums';
import { numericTransformer } from './numeric.transformer';
import { User } from './user.entity';
import { Coupon } from './coupon.entity';
import { GiftCard } from './gift-card.entity';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderNo: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, (u) => u.orders, { onDelete: 'SET NULL', nullable: true })
  user: User | null;

  @Column()
  email: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'enum', enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: numericTransformer })
  subtotal: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0, transformer: numericTransformer })
  discountTotal: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0, transformer: numericTransformer })
  giftCardTotal: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0, transformer: numericTransformer })
  shippingTotal: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: numericTransformer })
  grandTotal: number;

  @Column({ type: 'uuid', nullable: true })
  couponId: string | null;

  @ManyToOne(() => Coupon, { onDelete: 'SET NULL', nullable: true })
  coupon: Coupon | null;

  @Column({ type: 'varchar', nullable: true })
  couponCode: string | null;

  @Column({ type: 'uuid', nullable: true })
  giftCardId: string | null;

  @ManyToOne(() => GiftCard, { onDelete: 'SET NULL', nullable: true })
  giftCard: GiftCard | null;

  @Column()
  shippingName: string;

  @Column()
  shippingPhone: string;

  @Column()
  shippingCity: string;

  @Column()
  shippingDistrict: string;

  @Column({ type: 'text' })
  shippingAddress: string;

  @Column({ type: 'varchar', nullable: true })
  shippingZip: string | null;

  /* Fatura bilgileri (bos ise bireysel + teslimat adresi kullanilir) */
  @Column({ type: 'varchar', default: 'INDIVIDUAL' })
  invoiceType: string; // INDIVIDUAL | CORPORATE

  @Column({ type: 'varchar', nullable: true })
  invoiceTckn: string | null;

  @Column({ type: 'varchar', nullable: true })
  invoiceCompanyName: string | null;

  @Column({ type: 'varchar', nullable: true })
  invoiceTaxNo: string | null;

  @Column({ type: 'varchar', nullable: true })
  invoiceTaxOffice: string | null;

  @Column({ type: 'text', nullable: true })
  invoiceAddress: string | null;

  /** Durum gecmisi: [{ status, at(ISO) }] — zaman cizelgesi tooltip'leri icin */
  @Column({ type: 'jsonb', default: [] })
  statusHistory: { status: string; at: string }[];

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'varchar', nullable: true })
  trackingNo: string | null;

  @Column({ type: 'varchar', nullable: true })
  cargoCompany: string | null;

  @OneToMany(() => OrderItem, (i) => i.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

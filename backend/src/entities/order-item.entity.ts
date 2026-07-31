import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderItemType } from './enums';
import { numericTransformer } from './numeric.transformer';
import { Order } from './order.entity';
import { Product } from './product.entity';
import { GiftCard } from './gift-card.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @ManyToOne(() => Order, (o) => o.items, { onDelete: 'CASCADE' })
  order: Order;

  @Column({ type: 'enum', enum: OrderItemType, default: OrderItemType.PRODUCT })
  itemType: OrderItemType;

  @Column({ type: 'uuid', nullable: true })
  productId: string | null;

  @ManyToOne(() => Product, { onDelete: 'SET NULL', nullable: true })
  product: Product | null;

  @Column()
  name: string;

  /** Secilen varyant (varsa) — siparis aninda ad kopyalanir */
  @Column({ type: 'uuid', nullable: true })
  variantId: string | null;

  @Column({ type: 'varchar', nullable: true })
  variantName: string | null;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  /** Siparis anindaki kategori (urun silinirse benzer urunlere yonlendirme icin) */
  @Column({ type: 'varchar', nullable: true })
  categorySlug: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: numericTransformer })
  unitPrice: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'uuid', nullable: true })
  boughtGiftCardId: string | null;

  @OneToOne(() => GiftCard, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'boughtGiftCardId' })
  boughtGiftCard: GiftCard | null;
}

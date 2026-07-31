import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from './numeric.transformer';
import { Product } from './product.entity';

/**
 * Urune bagli secenek (Buyuk / Kucuk / Ikili Set gibi). Istege baglidir:
 * varyanti olmayan urun tek fiyat ve tek stokla satilir.
 */
@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @ManyToOne(() => Product, (p) => p.variants, { onDelete: 'CASCADE' })
  product: Product;

  /** Musteriye gosterilen secenek adi */
  @Column()
  name: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: numericTransformer })
  price: number;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  compareAtPrice: number | null;

  @Column({ default: 0 })
  stock: number;

  @Column({ type: 'varchar', nullable: true })
  sku: string | null;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;
}

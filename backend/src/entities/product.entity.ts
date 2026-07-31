import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from './numeric.transformer';
import { Category } from './category.entity';
import { ProductImage } from './product-image.entity';
import { ProductVariant } from './product-variant.entity';
import { Review } from './review.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  material: string | null;

  @Column({ type: 'varchar', nullable: true })
  dimensions: string | null;

  @Column({ type: 'varchar', nullable: true })
  care: string | null;

  @Column({ type: 'varchar', nullable: true })
  color: string | null;

  @Column({ type: 'varchar', nullable: true })
  origin: string | null;

  /* Desi hesabi icin olculer (cm) ve agirlik (kg) */
  @Column({ type: 'numeric', precision: 8, scale: 1, nullable: true, transformer: numericTransformer })
  widthCm: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 1, nullable: true, transformer: numericTransformer })
  heightCm: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 1, nullable: true, transformer: numericTransformer })
  depthCm: number | null;

  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true, transformer: numericTransformer })
  weightKg: number | null;

  /** Satir satir one cikan ozellikler (her satir bir madde) */
  @Column({ type: 'text', nullable: true })
  features: string | null;

  @Column({ type: 'text', nullable: true })
  boxContents: string | null;

  /** Urune ozel kargo ucreti; bos ise magaza geneli kullanilir. Sepette en yuksek olan uygulanir. */
  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  shippingFee: number | null;

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

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isFeatured: boolean;

  @Column({ default: 0 })
  viewCount: number;

  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => Category, (c) => c.products, { onDelete: 'SET NULL', nullable: true })
  category: Category | null;

  @OneToMany(() => ProductImage, (i) => i.product, { cascade: true })
  images: ProductImage[];

  /** Bos ise urun tek fiyat/stok ile satilir */
  @OneToMany(() => ProductVariant, (v) => v.product, { cascade: true })
  variants: ProductVariant[];

  @OneToMany(() => Review, (r) => r.product)
  reviews: Review[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

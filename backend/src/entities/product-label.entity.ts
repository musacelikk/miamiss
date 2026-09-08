import {
  Column,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from './product.entity';

/** Vitrin rozetinin rengi — karttaki Tükendi / indirim rozetleriyle uyumlu. */
export enum ProductLabelTone {
  DARK = 'DARK',
  ACCENT = 'ACCENT',
  MUTED = 'MUTED',
  WARM = 'WARM',
}

/** Adminin olusturdugu vitrin etiketi (Sınırlı Sayıda, Stok Tükeniyor vb.). */
@Entity('product_labels')
export class ProductLabel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'enum', enum: ProductLabelTone, default: ProductLabelTone.DARK })
  tone: ProductLabelTone;

  @Column({ default: 0 })
  sortOrder: number;

  @ManyToMany(() => Product, (p) => p.labels)
  products: Product[];
}

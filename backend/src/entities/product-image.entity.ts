import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity('product_images')
export class ProductImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @ManyToOne(() => Product, (p) => p.images, { onDelete: 'CASCADE' })
  product: Product;

  @Column()
  url: string;

  @Column({ type: 'varchar', nullable: true })
  alt: string | null;

  @Column({ default: 0 })
  sortOrder: number;
}

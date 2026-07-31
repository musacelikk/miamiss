import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Product } from './product.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ default: 0 })
  sortOrder: number;

  /** Anasayfa kategori kartinda gosterilen gorsel */
  @Column({ type: 'varchar', nullable: true })
  image: string | null;

  @OneToMany(() => Product, (p) => p.category)
  products: Product[];
}

import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Product } from './product.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @ManyToOne(() => Product, (p) => p.reviews, { onDelete: 'CASCADE' })
  product: Product;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, (u) => u.reviews, { onDelete: 'SET NULL', nullable: true })
  user: User | null;

  /** Admin tarafindan manuel eklenen yorumlarda gosterilecek isim */
  @Column({ type: 'varchar', nullable: true })
  displayName: string | null;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text' })
  comment: string;

  @Column({ default: false })
  isApproved: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

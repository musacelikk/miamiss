import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
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

  /** Yanit ise bagli oldugu ust yorum (tek seviye) */
  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => Review, (r) => r.replies, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: Review | null;

  @OneToMany(() => Review, (r) => r.parent)
  replies: Review[];

  /** Yanitlarda puan olmaz (null) */
  @Column({ type: 'int', nullable: true })
  rating: number | null;

  @Column({ type: 'text' })
  comment: string;

  /** Yorumlar onay gerektirmeden yayinlanir; admin gerekirse kaldirir */
  @Column({ default: true })
  isApproved: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

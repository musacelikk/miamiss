import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Coupon } from './coupon.entity';

@Entity('puzzle_words')
export class PuzzleWord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  word: string;

  @Column()
  hint: string;

  @Column({ default: true })
  isActive: boolean;
}

@Entity('puzzle_wins')
export class PuzzleWin {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  sessionKey: string;

  /** Tarayici verisi silinerek kupon uretilmesini engellemek icin */
  @Index()
  @Column({ type: 'varchar', nullable: true })
  ipAddress: string | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  user: User | null;

  @Column({ type: 'uuid', nullable: true })
  wordId: string | null;

  @ManyToOne(() => PuzzleWord, { onDelete: 'SET NULL', nullable: true })
  word: PuzzleWord | null;

  @Column({ type: 'uuid', nullable: true })
  couponId: string | null;

  @ManyToOne(() => Coupon, { onDelete: 'SET NULL', nullable: true })
  coupon: Coupon | null;

  @CreateDateColumn()
  createdAt: Date;
}

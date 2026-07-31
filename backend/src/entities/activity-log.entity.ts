import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  /** ADMIN | CUSTOMER | GUEST */
  @Index()
  @Column({ type: 'varchar', default: 'GUEST' })
  actorType: string;

  @Index()
  @Column()
  action: string;

  @Column({ type: 'text', nullable: true })
  detail: string | null;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum TicketStatus {
  OPEN = 'OPEN',
  ANSWERED = 'ANSWERED',
  CLOSED = 'CLOSED',
}

export enum SenderType {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
}

@Entity('support_tickets')
export class SupportTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Kisa referans kodu (musteriye gosterilir) */
  @Index()
  @Column({ unique: true })
  ticketNo: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  user: User | null;

  @Column()
  email: string;

  @Column()
  name: string;

  @Column()
  subject: string;

  /** Ilgili siparis numarasi (istege bagli) */
  @Column({ type: 'varchar', nullable: true })
  orderNo: string | null;

  @Index()
  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.OPEN })
  status: TicketStatus;

  /** Admin panelde okunmamis rozetini gostermek icin */
  @Column({ default: false })
  isReadByAdmin: boolean;

  @OneToMany(() => SupportMessage, (m) => m.ticket, { cascade: true })
  messages: SupportMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('support_messages')
export class SupportMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ticketId: string;

  @ManyToOne(() => SupportTicket, (t) => t.messages, { onDelete: 'CASCADE' })
  ticket: SupportTicket;

  @Column({ type: 'enum', enum: SenderType })
  senderType: SenderType;

  @Column()
  senderName: string;

  @Column({ type: 'text' })
  body: string;

  @CreateDateColumn()
  createdAt: Date;
}

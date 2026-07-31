import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Reklam/kampanya sablonu. EMAIL icin content HTML'dir,
 * SMS icin duz metindir. {{name}} yer tutucusu alici adiyla degistirilir.
 */
@Entity('marketing_templates')
export class MarketingTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', default: 'EMAIL' })
  type: string; // EMAIL | SMS

  @Column({ type: 'varchar', nullable: true })
  subject: string | null;

  @Column({ type: 'text', default: '' })
  content: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastSentAt: Date | null;

  @Column({ default: 0 })
  sentCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

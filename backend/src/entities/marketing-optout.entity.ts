import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Pazarlama e-postalarindan cikanlar (unsubscribe). Uyeler icin ayrica
 * user.acceptsMarketing=false yapilir; bu tablo cikis tarihini ve uye
 * olmayan (elle eklenen) adresleri de kayit altina alir.
 */
@Entity('marketing_optouts')
export class MarketingOptout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

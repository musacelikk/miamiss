import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('blog_posts')
export class BlogPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', default: '' })
  excerpt: string;

  /** Icerik: format alanina gore duz metin, markdown veya HTML */
  @Column({ type: 'text', default: '' })
  content: string;

  /** Icerik formati: TEXT (bos satirla paragraf), MARKDOWN veya HTML */
  @Column({ type: 'varchar', default: 'TEXT' })
  format: 'TEXT' | 'MARKDOWN' | 'HTML';

  @Column({ type: 'varchar', nullable: true })
  coverImage: string | null;

  @Column({ default: false })
  isPublished: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

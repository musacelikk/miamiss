import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('addresses')
export class Address {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (u) => u.addresses, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  title: string;

  @Column()
  fullName: string;

  @Column()
  phone: string;

  @Column()
  city: string;

  @Column()
  district: string;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'varchar', nullable: true })
  zip: string | null;

  @Column({ default: false })
  isDefault: boolean;
}

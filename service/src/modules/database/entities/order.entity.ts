import { IRuneItem } from 'src/common/handlers/runes/types';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { TransactionRuneEntry } from './rune-entry.entity';

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int4' })
  @Index()
  userId: number;

  @Column({ type: 'integer' })
  makerFeeBp: number;

  @Column({ type: 'varchar' })
  sellerRuneAddress: string;

  @Column({ type: 'integer' })
  price: number;

  @Column({ type: 'jsonb' })
  runeItem: IRuneItem;

  @Column({ type: 'varchar' })
  sellerReceiveAddress: string;

  @Column({ type: 'varchar', nullable: true })
  status: string;

  @Column({ type: 'text' })
  unsignedListingPSBTBase64: string;

  @Column({ type: 'text', nullable: true })
  signedListingPSBTBase64: string;

  @Column({ type: 'text', nullable: true })
  tapInternalKey: string;

  @Column({ type: 'text', nullable: true })
  publicKey: string;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;

  user: User;
  runeInfo: TransactionRuneEntry;
}

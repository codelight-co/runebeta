import { IRuneItem } from 'src/common/handlers/runes/types';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
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

  @Column({ type: 'int4', nullable: true })
  @Index()
  buyerId: number;

  @Column({ type: 'integer' })
  makerFeeBp: number;

  @Column({ type: 'varchar' })
  sellerRuneAddress: string;

  @Column({ type: 'varchar', nullable: true })
  buyerRuneAddress: string;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  tx_hash?: string;

  @Column({ type: 'integer' })
  price: number;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  rune_id: string;

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

  @ManyToOne(
    () => TransactionRuneEntry,
    (transactionRuneEntry) => transactionRuneEntry.orders,
  )
  @JoinColumn({ name: 'rune_id', referencedColumnName: 'rune_id' })
  runeInfo: TransactionRuneEntry;

  user: User;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TransactionRuneEntry } from './rune-entry.entity';

@Entity()
export class RuneStat {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  @Index()
  rune_id: string;

  @Column({ type: 'int8', nullable: true })
  total_transactions: number;

  @Column({ type: 'int8', nullable: true })
  total_mints: number;

  @Column({ type: 'int8', nullable: true })
  total_burns: number;

  @Column({ type: 'int8', nullable: true })
  total_supply: number;

  @Column({ type: 'int8', nullable: true })
  total_holders: number;

  @Column({ type: 'boolean', nullable: true, default: false })
  mintable: boolean;

  @Column({ type: 'int8', nullable: true })
  term: number;

  @Column({ type: 'int8', nullable: true, default: 0 })
  start_block: number;

  @Column({ type: 'int8', nullable: true, default: 0 })
  end_block: number;

  @Column({ type: 'jsonb', nullable: true })
  height: Array<number>;

  @Column({ type: 'jsonb', nullable: true })
  offset: Array<number>;

  @Column({ type: 'varchar', nullable: true })
  mint_type: string;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => TransactionRuneEntry, (runeEntry) => runeEntry.stat)
  rune: TransactionRuneEntry;
}

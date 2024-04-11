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

  @Column({ type: 'decimal', nullable: true })
  total_transactions: number;

  @Column({ type: 'int8', nullable: true, default: 0 })
  total_mints: number;

  @Column({ type: 'int8', nullable: true, default: 0 })
  total_burns: number;

  @Column({ type: 'decimal', nullable: true })
  total_supply: number;

  @Column({ type: 'int8', nullable: true, default: 0 })
  total_holders: number;

  @Column({ type: 'decimal', nullable: true })
  change_24h: number;

  @Column({ type: 'decimal', nullable: true })
  volume_24h: number;

  @Column({ type: 'decimal', nullable: true })
  prev_volume_24h: number;

  @Column({ type: 'decimal', nullable: true })
  total_volume: number;

  @Column({ type: 'decimal', nullable: true })
  market_cap: number;

  @Column({ type: 'boolean', nullable: true, default: false })
  mintable: boolean;

  @Column({ type: 'decimal', nullable: true })
  term: bigint;

  @Column({ type: 'decimal', nullable: true })
  limit: number;

  @Column({ type: 'decimal', nullable: true })
  premine: number;

  @Column({ type: 'int8', nullable: true, default: 0 })
  start_block: number;

  @Column({ type: 'int8', nullable: true, default: 0 })
  end_block: number;

  @Column({ type: 'jsonb', nullable: true })
  height: Array<number>;

  @Column({ type: 'jsonb', nullable: true })
  offset: Array<number>;

  @Column({ type: 'jsonb', nullable: true })
  entry: any;

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

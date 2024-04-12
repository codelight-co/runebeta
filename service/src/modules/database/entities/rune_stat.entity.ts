import {
  Column,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TransactionRuneEntry } from './rune-entry.entity';
import { IEntry } from 'src/common/interfaces/rune.interface';
import BaseTable from '../base-table';

@Entity()
export class RuneStat extends BaseTable {
  constructor(partial: Partial<RuneStat>) {
    super();
    Object.assign(this, partial);
  }

  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  @Index()
  rune_id: string;

  @Column({ type: 'decimal', nullable: true })
  total_transactions: bigint;

  @Column({ type: 'decimal', nullable: true, default: 0 })
  total_mints: bigint;

  @Column({ type: 'decimal', nullable: true, default: 0 })
  total_burns: bigint;

  @Column({ type: 'decimal', nullable: true })
  total_supply: bigint;

  @Column({ type: 'int8', nullable: true, default: 0 })
  total_holders: number;

  @Column({ type: 'decimal', nullable: true })
  price: bigint;

  @Column({ type: 'decimal', nullable: true })
  change_24h: number;

  @Column({ type: 'decimal', nullable: true })
  volume_24h: bigint;

  @Column({ type: 'decimal', nullable: true })
  prev_volume_24h: bigint;

  @Column({ type: 'decimal', nullable: true })
  total_volume: bigint;

  @Column({ type: 'decimal', nullable: true })
  market_cap: bigint;

  @Column({ type: 'boolean', nullable: true, default: false })
  mintable: boolean;

  @Column({ type: 'decimal', nullable: true })
  term: bigint;

  @Column({ type: 'decimal', nullable: true })
  limit: bigint;

  @Column({ type: 'decimal', nullable: true })
  premine: bigint;

  @Column({ type: 'int8', nullable: true, default: 0 })
  start_block: number;

  @Column({ type: 'int8', nullable: true, default: 0 })
  end_block: number;

  @Column({ type: 'jsonb', nullable: true })
  height: Array<number>;

  @Column({ type: 'jsonb', nullable: true })
  offset: Array<number>;

  @Column({
    type: 'jsonb',
    nullable: true,
    transformer: {
      to: (value: any) => {
        return value;
      },
      from: (value: IEntry) => {
        const remaining =
          value?.terms?.cap && value?.mints
            ? (BigInt(value.terms.cap) - BigInt(value.mints)).toString()
            : null;
        return {
          block: value.block.toString(),
          burned: value.burned.toString(),
          divisibility: value.divisibility,
          etching: value.etching,
          mints: value.mints.toString(),
          remaining,
          number: value.number.toString(),
          premine: value.premine.toString(),
          spaced_rune: value.spaced_rune,
          symbol: value.symbol,
          timestamp: value.timestamp,
          terms: {
            amount: value?.terms?.amount?.toString(),
            cap: value?.terms?.cap?.toString(),
            height: value?.terms?.height,
            offset: value?.terms?.offset,
          },
        };
      },
    },
  })
  entry?: IEntry;

  @Column({ type: 'varchar', nullable: true })
  mint_type: string;

  @OneToOne(() => TransactionRuneEntry, (runeEntry) => runeEntry.stat)
  rune: TransactionRuneEntry;
}

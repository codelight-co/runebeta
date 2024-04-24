import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { IEntry } from 'src/common/interfaces/rune.interface';
import BaseTable from '../../base-table';

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

  @Column({ type: 'varchar', nullable: true })
  @Index()
  rune_name: string;

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
  ma_price: bigint;

  @Column({ type: 'decimal', nullable: true })
  change_24h: number;

  @Column({ type: 'int8', nullable: true })
  order_sold: number;

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

  @Column({ type: 'int8', nullable: true, default: 0, name: 'block_start' })
  start_block: number;

  @Column({ type: 'int8', nullable: true, default: 0, name: 'block_end' })
  end_block: number;

  @Column({ type: 'varchar', nullable: true })
  etching: string;

  @Column({ type: 'varchar', nullable: true })
  parent: string;

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
            ? (BigInt(value.terms.cap) - BigInt(value.mints))?.toLocaleString(
                'fullwide',
                {
                  useGrouping: false,
                },
              )
            : null;
        return {
          block: value?.block?.toLocaleString('fullwide', {
            useGrouping: false,
          }),
          burned: value?.burned?.toLocaleString('fullwide', {
            useGrouping: false,
          }),
          divisibility: value?.divisibility,
          etching: value?.etching,
          mints: value?.mints?.toLocaleString('fullwide', {
            useGrouping: false,
          }),
          remaining,
          number: value?.number?.toLocaleString('fullwide', {
            useGrouping: false,
          }),
          premine: value?.premine?.toLocaleString('fullwide', {
            useGrouping: false,
          }),
          spaced_rune: value?.spaced_rune,
          symbol: value?.symbol,
          timestamp: value?.timestamp,
          terms: {
            amount: value?.terms?.amount?.toLocaleString('fullwide', {
              useGrouping: false,
            }),
            cap: value?.terms?.cap?.toLocaleString('fullwide', {
              useGrouping: false,
            }),
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
}

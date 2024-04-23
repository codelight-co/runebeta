import {
  AfterLoad,
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OutpointRuneBalance } from './outpoint-rune-balance.entity';

@Entity({ synchronize: false })
export class TransactionRuneEntry {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  tx_hash: string;

  @Column({ type: 'int8' })
  block_height: string;

  @Column({ type: 'int4' })
  tx_index: string;

  @Column({ type: 'varchar' })
  rune_id: string;

  @Column({ type: 'text' })
  burned: string;

  @Column({ type: 'int2' })
  divisibility: number;

  @Column({ type: 'varchar' })
  etching: string;

  @Column({ type: 'varchar' })
  parent: string;

  @Column({ type: 'bool' })
  mintable: boolean;

  @Column({ type: 'bool' })
  turbo: boolean;

  @Column({ type: 'int8' })
  mints: bigint;

  @Column({ type: 'int8' })
  premine: bigint;

  @Column({ type: 'int8' })
  number: string;

  @Column({ type: 'jsonb' })
  terms: any;

  @Column({ type: 'text' })
  rune: string;

  @Column({ type: 'int4' })
  spacers: number;

  @Column({ type: 'text' })
  supply: string;

  @Column({ type: 'numeric' })
  remaining: bigint;

  @Column({ type: 'varchar' })
  spaced_rune: string;

  @Column({ type: 'text' })
  symbol: string;

  @Column({ type: 'int4' })
  timestamp: number;

  rune_hex: string;

  @OneToMany(
    () => OutpointRuneBalance,
    (outpointRuneBalance) => outpointRuneBalance.rune,
  )
  @JoinColumn({ name: 'rune_id', referencedColumnName: 'rune_id' })
  outpointRuneBalances: OutpointRuneBalance[];

  // @OneToOne(() => RuneStat, (runeStat) => runeStat.rune)
  // @JoinColumn({ name: 'rune_id', referencedColumnName: 'rune_id' })
  // stat: RuneStat;

  @AfterLoad()
  afterLoad() {
    if (!this.symbol) {
      this.symbol = '¤';
    }
    this.rune_hex = Buffer.from(this.rune_id).toString('hex');
  }
}

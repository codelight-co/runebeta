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

  @Column({ type: 'varchar' })
  rune_id: string;

  @Column({ type: 'text' })
  burned: string;

  @Column({ type: 'int2' })
  divisibility: number;

  @Column({ type: 'varchar' })
  etching: string;

  @Column({ type: 'int8' })
  mints: string;

  @Column({ type: 'int8' })
  number: string;

  @Column({ type: 'jsonb' })
  mint_entry: any;

  @Column({ type: 'text' })
  rune: string;

  @Column({ type: 'int4' })
  spacers: number;

  @Column({ type: 'text' })
  supply: string;

  @Column({ type: 'varchar' })
  spaced_rune: string;

  @Column({ type: 'text' })
  symbol: string;

  @Column({ type: 'int4' })
  timestamp: number;

  @OneToMany(
    () => OutpointRuneBalance,
    (outpointRuneBalance) => outpointRuneBalance.rune,
  )
  @JoinColumn({ name: 'rune_id', referencedColumnName: 'rune_id' })
  outpointRuneBalances: OutpointRuneBalance[];

  @AfterLoad()
  afterLoad() {
    if (!this.symbol) {
      this.symbol = '¤';
    }
  }
}

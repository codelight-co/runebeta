import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { Transaction } from './transaction.entity';
import { TxidRune } from './txid-rune.entity';
import { OutpointRuneBalance } from './outpoint-rune-balance.entity';

@Entity({ synchronize: false })
export class TransactionOut {
  @PrimaryColumn()
  id!: string;

  @Column({ type: 'varchar' })
  tx_hash: string;

  @Column({ type: 'int8' })
  value: number;

  @Column({ type: 'int8' })
  dust_value: number;

  @Column({ type: 'int8' })
  vout: number;

  @Column({ type: 'varchar' })
  asm: string;

  @Column({ type: 'text' })
  script_pubkey: string;

  @Column({ type: 'varchar' })
  address: string;

  @Column({ type: 'bool' })
  spent: boolean;

  @ManyToOne(() => Transaction, (transaction) => transaction.vout)
  @JoinColumn({ name: 'tx_hash', referencedColumnName: 'tx_hash' })
  transaction: Transaction;

  @OneToMany(() => TxidRune, (txidRune) => txidRune.vout)
  @JoinColumn({ name: 'tx_hash', referencedColumnName: 'tx_hash' })
  txidRunes: TxidRune[];

  @OneToMany(
    () => OutpointRuneBalance,
    (outpointRuneBalance) => outpointRuneBalance.txOut,
  )
  @JoinColumn([
    { name: 'tx_hash', referencedColumnName: 'tx_hash' },
    { name: 'vout', referencedColumnName: 'vout' },
  ])
  outpointRuneBalances: OutpointRuneBalance[];
}

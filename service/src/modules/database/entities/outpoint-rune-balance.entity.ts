import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TransactionOut } from './transaction-out.entity';
import { TransactionRuneEntry } from './rune-entry.entity';
import { TxidRune } from './txid-rune.entity';

@Entity({ synchronize: false })
export class OutpointRuneBalance {
  @PrimaryColumn()
  id!: number;

  @Column({ type: 'varchar' })
  tx_hash: string;

  @Column({ type: 'int4' })
  vout: number;

  @Column({ type: 'varchar' })
  rune_id: string;

  @Column({ type: 'varchar' })
  balance_value: string;

  @Column({ type: 'int8' })
  block_height: number;

  @Column({ type: 'int8' })
  tx_index: number;

  @ManyToOne(
    () => TransactionOut,
    (transactionOut) => transactionOut.outpointRuneBalances,
  )
  @JoinColumn([
    { name: 'tx_hash', referencedColumnName: 'tx_hash' },
    { name: 'vout', referencedColumnName: 'vout' },
  ])
  txOut: TransactionOut;

  @ManyToOne(
    () => TransactionRuneEntry,
    (transactionRuneEntry) => transactionRuneEntry.outpointRuneBalances,
  )
  @JoinColumn({ name: 'rune_id', referencedColumnName: 'rune_id' })
  rune: TransactionRuneEntry;

  @ManyToOne(() => TxidRune, (txidRune) => txidRune.outpointRuneBalances)
  @JoinColumn({ name: 'tx_hash', referencedColumnName: 'tx_hash' })
  txid_rune: TxidRune;
}

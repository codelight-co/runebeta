import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Transaction } from './transaction.entity';

@Entity({ synchronize: false })
export class TransactionOut {
  @PrimaryColumn()
  id!: string;

  @Column({ type: 'varchar' })
  tx_hash: string;

  @Column({ type: 'bigint' })
  value: bigint;

  @Column({ type: 'text' })
  script_pubkey: string;

  @ManyToOne(() => Transaction, (transaction) => transaction.vout)
  @JoinColumn({ name: 'tx_hash', referencedColumnName: 'tx_hash' })
  transaction: Transaction;
}

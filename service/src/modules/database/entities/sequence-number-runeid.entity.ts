import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { TransactionOut } from './transaction-out.entity';

@Entity({ synchronize: false })
export class OutpointRuneBalance {
  @PrimaryColumn()
  id!: number;

  @Column({ type: 'varchar' })
  tx_hash: string;

  vout: number;

  @Column({ type: 'varchar' })
  rune_id: string;

  @Column({ type: 'varchar' })
  balance_value: string;

  @ManyToOne(() => TransactionOut, (transactionOut) => transactionOut.txidRunes)
  @JoinColumn({ name: 'tx_hash', referencedColumnName: 'tx_hash' })
  txOut: TransactionOut;
}

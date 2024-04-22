import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Transaction } from './transaction.entity';

@Entity({ synchronize: false })
export class TransactionIns {
  @PrimaryColumn()
  id!: string;

  @Column({ type: 'varchar' })
  tx_hash: string;

  @Column({ type: 'varchar' })
  previous_output_hash: string;

  @Column({ type: 'integer' })
  previous_output_vout: number;

  @Column({ type: 'text' })
  script_sig: string;

  @Column({ type: 'integer' })
  sequence_number: number;

  @Column({ type: 'varchar' })
  witness: string;

  @ManyToOne(() => Transaction, (transaction) => transaction.vin)
  @JoinColumn({ name: 'tx_hash', referencedColumnName: 'tx_hash' })
  transaction: Transaction;
}

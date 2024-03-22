import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Transaction } from './transaction.entity';

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
}

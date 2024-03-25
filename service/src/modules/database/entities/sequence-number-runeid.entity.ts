import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TransactionOut } from './transaction-out.entity';

@Entity({ synchronize: false })
export class OutpointRuneBalance {
  @PrimaryColumn()
  id!: number;

  @Column({ type: 'varchar' })
  tx_hash: string;

  @Column({ type: 'smallint' })
  vour: number;

  @Column({ type: 'varchar' })
  balance_id: bigint;

  @Column({ type: 'varchar' })
  balance_value: string;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => TransactionOut, (transactionOut) => transactionOut.txidRunes)
  vout: TransactionOut;
}

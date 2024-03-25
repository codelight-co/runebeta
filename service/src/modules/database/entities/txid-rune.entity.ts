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
export class TxidRune {
  @PrimaryColumn()
  id!: number;

  @Column({ nullable: true })
  tx_hash: string;

  @Column({ type: 'text' })
  rune: string;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => TransactionOut, (transactionOut) => transactionOut.txidRunes)
  vout: TransactionOut;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TransactionIns } from './transaction-ins.entity';
import { TransactionOut } from './transaction-out.entity';

@Entity()
export class Transaction {
  @PrimaryColumn()
  id!: string;

  @Column({ type: 'integer' })
  version: number;

  @Column({ type: 'varchar' })
  tx_hash?: string;

  @Column({ nullable: true, type: 'integer' })
  locktime?: number;

  vin: TransactionIns[];

  vout: TransactionOut[];

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

import {
  AfterLoad,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { TransactionIns } from './transaction-ins.entity';
import { TransactionOut } from './transaction-out.entity';
import { Block } from './block.entity';

@Entity({ synchronize: false })
export class Transaction {
  @PrimaryColumn()
  id!: string;

  @Column({ type: 'integer' })
  version: number;

  @Column({ type: 'varchar' })
  tx_hash?: string;

  @Column({ nullable: true, type: 'integer' })
  lock_time?: number;

  @Column({ type: 'int8' })
  block_height: number;

  block_number: number;
  timestamp: number;

  @ManyToOne(() => Block, (block) => block.transactions)
  @JoinColumn({ name: 'block_height', referencedColumnName: 'block_height' })
  block: Block;

  @OneToMany(
    () => TransactionIns,
    (transactionIns) => transactionIns.transaction,
  )
  @JoinColumn({ name: 'tx_hash', referencedColumnName: 'tx_hash' })
  vin: TransactionIns[];

  @OneToMany(
    () => TransactionOut,
    (transactionOut) => transactionOut.transaction,
  )
  @JoinColumn({ name: 'tx_hash', referencedColumnName: 'tx_hash' })
  vout: TransactionOut[];

  @AfterLoad()
  afterLoad() {
    this.block_number = this.block_height ? +this.block_height : 0;
  }
}

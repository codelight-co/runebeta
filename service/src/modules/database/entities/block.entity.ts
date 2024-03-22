import { Column, Entity, JoinColumn, OneToMany, PrimaryColumn } from 'typeorm';
import { Transaction } from './transaction.entity';

@Entity({ synchronize: false })
export class Block {
  @PrimaryColumn()
  id!: string;

  @Column({ type: 'varchar' })
  previous_hash?: string;

  @Column({ type: 'varchar' })
  tx_hash?: string;

  @Column({ type: 'varchar' })
  block_hash?: string;

  @Column({ type: 'int8' })
  block_height: number;

  @Column({ type: 'int8' })
  block_time: number;

  @OneToMany(() => Transaction, (transaction) => transaction.block)
  @JoinColumn({ name: 'block_height', referencedColumnName: 'block_height' })
  transactions: Transaction[];
}

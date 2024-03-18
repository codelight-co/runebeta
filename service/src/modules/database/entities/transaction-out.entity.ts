import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class TransactionOut {
  @PrimaryColumn()
  id!: string;

  @Column({ type: 'varchar' })
  tx_hash: string;

  @Column({ type: 'bigint' })
  value: bigint;

  @Column({ type: 'text' })
  script_pubkey: string;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

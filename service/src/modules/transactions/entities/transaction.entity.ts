import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Transaction {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  block_number?: number;

  @Column({ nullable: true, type: 'decimal' })
  fee?: number;

  @Column({ nullable: true })
  hash?: string;

  @Column({ nullable: true })
  hex?: string;

  @Column({ nullable: true })
  locktime?: number;

  @Column({ nullable: true })
  size?: number;

  @Column({ nullable: true })
  timestamp?: number;

  @Column({ nullable: true })
  txid?: string;

  @Column({ nullable: true })
  version?: number;

  @Column({ nullable: true })
  vsize?: number;

  @Column({ nullable: true })
  weight?: number;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

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

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

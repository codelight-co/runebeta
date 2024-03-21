import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
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
}

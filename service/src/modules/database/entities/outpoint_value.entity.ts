import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ synchronize: false })
export class OutpointValue {
  @PrimaryColumn()
  id!: number;

  @Column({ type: 'varchar' })
  tx_hash: string;

  @Column({ type: 'smallint' })
  vout: number;

  @Column({ type: 'varchar' })
  amount: string;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

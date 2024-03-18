import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class TransactionIns {
  @PrimaryColumn()
  id!: string;

  @Column({ type: 'varchar' })
  tx_hash: string;

  @Column({ type: 'varchar' })
  previous_output_hash: string;

  @Column({ type: 'integer' })
  previous_output_vout: number;

  @Column({ type: 'text' })
  script_sig: string;

  @Column({ type: 'integer' })
  sequence_number: number;

  @Column({ type: 'varchar' })
  witness: string;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

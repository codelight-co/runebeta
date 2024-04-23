import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ synchronize: false })
export class Satpoint {
  @PrimaryColumn()
  id!: number;

  @Column({ type: 'integer' })
  sequence_number: number;

  @Column({ type: 'varchar' })
  tx_hash: string;

  @Column({ type: 'integer' })
  vout: number;

  @Column({ type: 'bigint' })
  sat_offset: bigint;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

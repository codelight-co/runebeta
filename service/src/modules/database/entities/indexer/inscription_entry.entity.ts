import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ synchronize: false })
export class InscriptionEntry {
  @PrimaryColumn()
  id!: string;

  @Column({ type: 'smallint' })
  charms: number;

  @Column({ type: 'bigint' })
  fee: number;

  @Column({ type: 'integer' })
  height: number;

  @Column({ type: 'text' })
  tx_hash: string;

  @Column({ type: 'integer' })
  inscription_index: number;

  @Column({ type: 'integer' })
  inscription_number: number;

  @Column({ type: 'integer' })
  parent: number;

  @Column({ type: 'bigint' })
  sat: bigint;

  @Column({ type: 'integer' })
  sequence_number: number;

  @Column({ type: 'integer' })
  timestamp: number;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

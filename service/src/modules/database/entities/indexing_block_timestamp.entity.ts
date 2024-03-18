import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class IndexingBlockTimestamp {
  @PrimaryColumn()
  id!: number;

  @Column({ type: 'integer' })
  block_height: number;

  @Column({ type: 'bigint' })
  timestamps: number;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

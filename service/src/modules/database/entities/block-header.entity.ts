import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ synchronize: false })
export class BlockHeader {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'bigint' })
  height: bigint;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class RuneStat {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  @Index()
  rune_id: string;

  @Column({ type: 'int8', nullable: true })
  total_transactions: number;

  @Column({ type: 'int8', nullable: true })
  total_mints: number;

  @Column({ type: 'int8', nullable: true })
  total_burns: number;

  @Column({ type: 'int8', nullable: true })
  total_supply: number;

  @Column({ type: 'int8', nullable: true })
  total_holders: number;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

import { EEtchRuneStatus } from 'src/common/enums';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class EtchRune {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  @Index()
  user_id: number;

  @Column({ nullable: true })
  name: string;

  @Column({ type: 'int8' })
  @Index()
  commit_block_height: number;

  @Column({ type: 'int8' })
  @Index()
  mint_block_height: number;

  @Column({ type: 'text' })
  mint_tx_hex: string;

  @Column({ type: 'text', nullable: true })
  mint_tx_id: string;

  @Column({ type: 'varchar' })
  status: EEtchRuneStatus;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

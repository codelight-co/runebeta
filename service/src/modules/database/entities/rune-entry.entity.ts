import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ synchronize: false })
export class TransactionRuneEntry {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  tx_hash: string;

  @Column({ type: 'varchar' })
  rune_id: string;

  @Column({ type: 'text' })
  burned: string;

  @Column({ type: 'int2' })
  divisibility: number;

  @Column({ type: 'varchar' })
  etching: string;

  @Column({ type: 'int8' })
  mints: string;

  @Column({ type: 'int8' })
  number: string;

  @Column({ type: 'jsonb' })
  mint_entry: any;

  @Column({ type: 'text' })
  rune: string;

  @Column({ type: 'int4' })
  spacers: number;

  @Column({ type: 'text' })
  supply: string;

  @Column({ type: 'varchar' })
  spaced_rune: string;

  @Column({ type: 'text' })
  symbol: string;

  @Column({ type: 'int4' })
  timestamp: number;
}

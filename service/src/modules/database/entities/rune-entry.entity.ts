import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class RuneEntry {
  @PrimaryColumn()
  id!: number;

  @Column({ type: 'bigint' })
  rune_height: bigint;

  @Column({ type: 'smallint' })
  rune_index: number;

  @Column({ type: 'bytea' })
  burned: Array<string>;

  @Column({ type: 'smallint' })
  divisibility: number;

  @Column({ type: 'varchar' })
  etching: string;

  @Column({ type: 'jsonb', nullable: true })
  mint: any;

  @Column({ type: 'bigint' })
  mints: bigint;

  @Column({ type: 'bigint' })
  rnumber: bigint;

  @Column({ type: 'integer' })
  spacers: number;

  @Column({ type: 'bytea' })
  supply: Array<string>;

  @Column({ type: 'char' })
  symbol: string;

  @Column({ type: 'integer' })
  rtimestamp: number;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

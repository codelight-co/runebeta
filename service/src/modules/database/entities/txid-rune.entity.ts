import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ synchronize: false })
export class TxidRune {
  @PrimaryColumn()
  id!: number;

  @Column({ nullable: true })
  tx_hash: string;

  @Column({ type: 'text' })
  rune: string;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

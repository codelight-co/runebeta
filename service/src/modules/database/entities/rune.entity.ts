import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Rune {
  @PrimaryColumn()
  id!: number;

  @Column({ nullable: true })
  name: string;

  @Column({ type: 'bigint' })
  tx_height: string;

  @Column({ type: 'smallint' })
  rune_index: number;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

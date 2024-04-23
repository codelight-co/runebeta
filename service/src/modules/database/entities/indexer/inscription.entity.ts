import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ synchronize: false })
export class Inscription {
  @PrimaryColumn()
  id!: string;

  @Column({ type: 'integer' })
  home: number;

  @Column({ type: 'integer' })
  sequence_number: number;

  @Column({ type: 'text' })
  head: string;

  @Column({ type: 'text' })
  tail: string;

  @Column({ type: 'integer' })
  inscription_index: number;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Output {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  n: number;

  @Column({ nullable: true, type: 'jsonb' })
  scriptPubKey: {
    asm: string;
    hex: string;
    type: string;
    addresses: string;
  };

  @Column({ nullable: true, type: 'decimal' })
  value: number;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

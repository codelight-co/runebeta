import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Input {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true, type: 'jsonb' })
  scriptSig: {
    asm: string;
    hex: string;
  };

  @Column({ nullable: true })
  sequence: number;

  @Column({ nullable: true })
  txid: string;

  @Column({ nullable: true, type: 'jsonb' })
  txinwitness: string[];

  @Column({ nullable: true })
  type: string;

  @Column({ nullable: true })
  value: number;

  @Column({ nullable: true })
  vout: number;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

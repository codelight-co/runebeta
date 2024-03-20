import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  @Index()
  userId: number;

  @Column({ type: 'varchar' })
  @Index()
  txHash: string;

  @Column({ type: 'varchar' })
  @Index()
  symbol: string;

  @Column({ type: 'varchar' })
  @Index()
  runeId: string;

  @Column({ type: 'varchar' })
  signedTx: string;

  @Column({ type: 'integer' })
  amount: number;

  @Column({ type: 'integer' })
  price: number;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

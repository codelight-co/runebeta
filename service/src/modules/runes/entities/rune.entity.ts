import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Rune {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  burned: boolean;

  @Column({ nullable: true })
  collection_description: string;

  @Column({ nullable: true })
  collection_metadata: string;

  @Column({ nullable: true })
  collection_minted: boolean;

  @Column({ nullable: true })
  collection_owner: string;

  @Column({ nullable: true })
  collection_total_supply: number;

  @Column({ nullable: true })
  deploy_transaction: string;

  @Column({ nullable: true })
  divisibility: number;

  @Column({ nullable: true })
  end_block: number;

  @Column({ nullable: true })
  holder_count: number;

  @Column({ nullable: true })
  is_collection: boolean;

  @Column({ nullable: true })
  is_hot: boolean;

  @Column({ nullable: true })
  is_nft: boolean;

  @Column({ nullable: true })
  limit: number;

  @Column({ nullable: true })
  nft_collection: string;

  @Column({ nullable: true })
  nft_metadata: string;

  @Column({ nullable: true })
  rune: string;

  @Column({ nullable: true })
  rune_id: string;

  @Column({ nullable: true })
  supply: number;

  @Column({ nullable: true })
  symbol: string;

  @Column({ nullable: true })
  term: number;

  @Column({ nullable: true })
  timestamp: number;

  @Column({ nullable: true })
  transaction_count: number;

  @Column({ nullable: true })
  unit: string;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

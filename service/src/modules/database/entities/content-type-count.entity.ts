import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ synchronize: false })
export class ContentTypeCount {
  @PrimaryColumn()
  id!: string;

  @Column({ type: 'text' })
  content_type: string;

  @Column({ type: 'bigint' })
  count: bigint;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

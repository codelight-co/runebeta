import { Column, Entity } from 'typeorm';
import BaseTable from '../database/base-table';

@Entity()
export class Transaction extends BaseTable {
  @Column({ nullable: true })
  description?: string;
}

import { IsNumber } from 'class-validator';
import {
  Column,
  BaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

abstract class BaseTable extends BaseEntity {
  @PrimaryGeneratedColumn('increment')
  @IsNumber()
  public id: number;

  @Column()
  @CreateDateColumn()
  createdAt: Date;

  @Column()
  @UpdateDateColumn()
  updatedAt: Date;
}

export default BaseTable;

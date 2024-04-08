import { DataSource } from 'typeorm';
import { Transaction } from '../database/entities/transaction.entity';
import { TransactionRuneEntry } from '../database/entities/rune-entry.entity';
import { RuneStat } from '../database/entities';

export const statsProviders = [
  {
    provide: 'TRANSACTION_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(Transaction),
    inject: ['DATA_SOURCE'],
  },
  {
    provide: 'RUNE_ENTRY_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(TransactionRuneEntry),
    inject: ['DATA_SOURCE'],
  },
  {
    provide: 'RUNE_STAT_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(RuneStat),
    inject: ['DATA_SOURCE'],
  },
];

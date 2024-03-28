import { DataSource } from 'typeorm';
import { TransactionRuneEntry } from '../database/entities/rune-entry.entity';
import { Rune } from '../database/entities';

export const runesProviders = [
  {
    provide: 'RUNE_ENTRY_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(TransactionRuneEntry),
    inject: ['DATA_SOURCE'],
  },
  {
    provide: 'RUNE_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Rune),
    inject: ['DATA_SOURCE'],
  },
];

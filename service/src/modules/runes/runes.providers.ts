import { DataSource } from 'typeorm';
import { TransactionRuneEntry } from '../database/entities/indexer/rune-entry.entity';
import { EtchRune, RuneStat } from '../database/entities/indexer';

export const runesProviders = [
  {
    provide: 'RUNE_ENTRY_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(TransactionRuneEntry),
    inject: ['DATA_SOURCE'],
  },
  {
    provide: 'ETCH_RUNE_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(EtchRune),
    inject: ['MARKETPLACE_DATA_SOURCE'],
  },
  {
    provide: 'RUNE_STAT_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(RuneStat),
    inject: ['MARKETPLACE_DATA_SOURCE'],
  },
];

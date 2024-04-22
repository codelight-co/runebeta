import { DataSource } from 'typeorm';
import { Transaction } from '../database/entities/indexer/transaction.entity';
import { TransactionRuneEntry } from '../database/entities/indexer/rune-entry.entity';
import { RuneStat } from '../database/entities/indexer';
import { TxidRune } from '../database/entities/indexer/txid-rune.entity';

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
    inject: ['MARKETPLACE_DATA_SOURCE'],
  },
  {
    provide: 'TX_ID_RUNE_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(TxidRune),
    inject: ['DATA_SOURCE'],
  },
];

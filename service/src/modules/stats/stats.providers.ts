import { DataSource } from 'typeorm';
import { Transaction } from '../database/entities/indexer/transaction.entity';
import { TransactionRuneEntry } from '../database/entities/indexer/rune-entry.entity';
import { TxidRune } from '../database/entities/indexer/txid-rune.entity';
import { Order } from '../database/entities/marketplace/order.entity';
import { RuneStat } from '../database/entities/marketplace/rune_stat.entity';
import { SpentTransactionOut } from '../database/entities/indexer/spent-transaction-out.entity';

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
  {
    provide: 'ORDER_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Order),
    inject: ['MARKETPLACE_DATA_SOURCE'],
  },
  {
    provide: 'SPENT_TRANSACTION_OUT_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(SpentTransactionOut),
    inject: ['DATA_SOURCE'],
  },
];

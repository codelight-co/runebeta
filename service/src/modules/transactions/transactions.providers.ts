import { DataSource } from 'typeorm';
import { Transaction } from '../database/entities/indexer/transaction.entity';
import { TransactionIns } from '../database/entities/indexer/transaction-ins.entity';
import { TransactionOut } from '../database/entities/indexer/transaction-out.entity';
import { TxidRune } from '../database/entities/indexer/txid-rune.entity';
import { TransactionRuneEntry } from '../database/entities/indexer/rune-entry.entity';
import { OutpointRuneBalance } from '../database/entities/indexer/outpoint-rune-balance.entity';
import { RuneStat } from '../database/entities/indexer';
import { SpentOutpointRuneBalance } from '../database/entities/indexer/spent-outpoint-rune-balance.entity';
import { SpentTransactionOut } from '../database/entities/indexer/spent-transaction-out.entity';

export const transactionsProviders = [
  {
    provide: 'TRANSACTION_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(Transaction),
    inject: ['DATA_SOURCE'],
  },
  {
    provide: 'TRANSACTION_IN_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(TransactionIns),
    inject: ['DATA_SOURCE'],
  },
  {
    provide: 'TRANSACTION_OUT_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(TransactionOut),
    inject: ['DATA_SOURCE'],
  },
  {
    provide: 'SPENT_TRANSACTION_OUT_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(SpentTransactionOut),
    inject: ['DATA_SOURCE'],
  },
  {
    provide: 'TXID_RUNE_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(TxidRune),
    inject: ['DATA_SOURCE'],
  },
  {
    provide: 'RUNE_ENTRY_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(TransactionRuneEntry),
    inject: ['DATA_SOURCE'],
  },
  {
    provide: 'OUTPOINT_RUNE_BALANCE_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(OutpointRuneBalance),
    inject: ['DATA_SOURCE'],
  },
  {
    provide: 'SPENT_OUTPOINT_RUNE_BALANCE_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(SpentOutpointRuneBalance),
    inject: ['DATA_SOURCE'],
  },
  {
    provide: 'TX_ID_RUNE_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(TxidRune),
    inject: ['DATA_SOURCE'],
  },
  {
    provide: 'RUNE_STAT_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(RuneStat),
    inject: ['MARKETPLACE_DATA_SOURCE'],
  },
];

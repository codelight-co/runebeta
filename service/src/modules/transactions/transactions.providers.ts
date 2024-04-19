import { DataSource } from 'typeorm';
import { Transaction } from '../database/entities/transaction.entity';
import { TransactionIns } from '../database/entities/transaction-ins.entity';
import { TransactionOut } from '../database/entities/transaction-out.entity';
import { TxidRune } from '../database/entities/txid-rune.entity';
import { TransactionRuneEntry } from '../database/entities/rune-entry.entity';
import { OutpointRuneBalance } from '../database/entities/outpoint-rune-balance.entity';

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
    provide: 'TX_ID_RUNE_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(TxidRune),
    inject: ['DATA_SOURCE'],
  },
];

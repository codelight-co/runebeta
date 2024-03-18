import { DataSource } from 'typeorm';
import { Transaction } from '../database/entities/transaction.entity';
import { TransactionIns } from '../database/entities/transaction-ins.entity';
import { TransactionOut } from '../database/entities/transaction-out.entity';
import { TxidRune } from '../database/entities/txid-rune.entity';

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
];

import { DataSource } from 'typeorm';
import { User } from '../database/entities/marketplace/user.entity';
import { TransactionOut } from '../database/entities/indexer/transaction-out.entity';
import { Transaction } from '../database/entities/indexer/transaction.entity';
import { TransactionRuneEntry } from '../database/entities/indexer/rune-entry.entity';
import { Order } from '../database/entities/marketplace/order.entity';

export const userProviders = [
  {
    provide: 'USER_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(User),
    inject: ['MARKETPLACE_DATA_SOURCE'],
  },
  {
    provide: 'TRANSACTION_OUT_REPOSITORY',
    useFactory: (dataSource: DataSource) =>
      dataSource.getRepository(TransactionOut),
    inject: ['DATA_SOURCE'],
  },
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
    provide: 'ORDER_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Order),
    inject: ['MARKETPLACE_DATA_SOURCE'],
  },
];

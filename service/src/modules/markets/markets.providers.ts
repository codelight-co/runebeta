import { DataSource } from 'typeorm';
import { Order } from '../database/entities/marketplace/order.entity';
import { TransactionRuneEntry } from '../database/entities/indexer/rune-entry.entity';
import { OutpointRuneBalance } from '../database/entities/indexer/outpoint-rune-balance.entity';
import { RuneStat } from '../database/entities/indexer';

export const ordersProviders = [
  {
    provide: 'ORDER_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Order),
    inject: ['MARKETPLACE_DATA_SOURCE'],
  },
  {
    provide: 'RUNE_STAT_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(RuneStat),
    inject: ['MARKETPLACE_DATA_SOURCE'],
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
];

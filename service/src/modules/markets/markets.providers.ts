import { DataSource } from 'typeorm';
import { Order } from '../database/entities/order.entity';
import { TransactionRuneEntry } from '../database/entities/rune-entry.entity';
import { OutpointRuneBalance } from '../database/entities/outpoint-rune-balance.entity';

export const ordersProviders = [
  {
    provide: 'ORDER_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(Order),
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
];

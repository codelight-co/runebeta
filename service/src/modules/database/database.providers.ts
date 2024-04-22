import {
  DATABASE_HOST,
  DATABASE_TYPE,
  DATABASE_NAME,
  DATABASE_PASSWORD,
  DATABASE_PORT,
  DATABASE_USER,
  MARKETPLACE_DATABASE_TYPE,
  MARKETPLACE_DATABASE_HOST,
  MARKETPLACE_DATABASE_PORT,
  MARKETPLACE_DATABASE_USER,
  MARKETPLACE_DATABASE_PASSWORD,
  MARKETPLACE_DATABASE_NAME,
} from 'src/environments';
import { DataSource } from 'typeorm';
import { NamingStrategy } from './naming.strategy';

export const databaseProviders = [
  {
    provide: 'DATA_SOURCE',
    useFactory: async () => {
      const dataSource = new DataSource({
        type: DATABASE_TYPE as any,
        host: DATABASE_HOST,
        port: DATABASE_PORT,
        username: DATABASE_USER,
        password: DATABASE_PASSWORD,
        database: DATABASE_NAME,
        entities: [`${__dirname}/**/indexer/*.entity{.ts,.js}`],
        namingStrategy: new NamingStrategy(),
        migrationsTableName: '__migrations',
        migrations: ['./migrations/**/*.ts'],
        synchronize: false,
      });

      return dataSource.initialize();
    },
  },
  {
    provide: 'MARKETPLACE_DATA_SOURCE',
    useFactory: async () => {
      const dataSource = new DataSource({
        type: MARKETPLACE_DATABASE_TYPE as any,
        host: MARKETPLACE_DATABASE_HOST,
        port: MARKETPLACE_DATABASE_PORT,
        username: MARKETPLACE_DATABASE_USER,
        password: MARKETPLACE_DATABASE_PASSWORD,
        database: MARKETPLACE_DATABASE_NAME,
        entities: [`${__dirname}/**/marketplace/*.entity{.ts,.js}`],
        namingStrategy: new NamingStrategy(),
        migrationsTableName: '__migrations',
        migrations: ['./migrations/**/*.ts'],
        synchronize: false,
      });

      return dataSource.initialize();
    },
  },
];

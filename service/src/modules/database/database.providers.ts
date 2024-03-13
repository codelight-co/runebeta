import {
  DATABASE_HOST,
  DATABASE_TYPE,
  DATABASE_NAME,
  DATABASE_PASSWORD,
  DATABASE_PORT,
  DATABASE_USER,
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
        entities: [`${__dirname}/**/*.entity{.ts,.js}`],
        namingStrategy: new NamingStrategy(),
        migrationsTableName: '__migrations',
        migrations: ['./migrations/**/*.ts'],
        synchronize: false,
      });

      return dataSource.initialize();
    },
  },
];

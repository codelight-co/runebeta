import * as dotenv from 'dotenv';
import {
  MARKETPLACE_DATABASE_TYPE,
  MARKETPLACE_DATABASE_HOST,
  MARKETPLACE_DATABASE_PORT,
  MARKETPLACE_DATABASE_USER,
  MARKETPLACE_DATABASE_PASSWORD,
  MARKETPLACE_DATABASE_NAME,
} from 'src/environments';
import { NamingStrategy } from 'src/modules/database/naming.strategy';
import { DataSource } from 'typeorm';

dotenv.config();

export const connectionSource = new DataSource({
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

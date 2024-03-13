import * as dotenv from 'dotenv';
import { NamingStrategy } from 'src/modules/database/naming.strategy';
import { DataSource } from 'typeorm';

dotenv.config();

export const connectionSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT, 10),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [`${__dirname}/**/*.entity{.ts,.js}`],
  namingStrategy: new NamingStrategy(),
  migrationsTableName: '__migrations',
  migrations: ['./migrations/**/*.ts'],
  synchronize: false,
});

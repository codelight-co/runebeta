import * as dotenv from 'dotenv';

dotenv.config();

const NEED_TO_CONFIGURED = '';

const ENV: string = process.env.ENV || 'development';

// JWT
const JWT_SECRET: string = process.env.JWT_SECRET || 'JWT_SECRET';

// Database
const DATABASE_TYPE: string = process.env.DATABASE_TYPE || NEED_TO_CONFIGURED;
const DATABASE_HOST: string = process.env.DATABASE_HOST || NEED_TO_CONFIGURED;
const DATABASE_NAME: string = process.env.DATABASE_NAME || NEED_TO_CONFIGURED;
const DATABASE_USER: string = process.env.DATABASE_USER || NEED_TO_CONFIGURED;
const DATABASE_PASSWORD: string =
  process.env.DATABASE_PASSWORD || NEED_TO_CONFIGURED;
const DATABASE_PORT: number = +process.env.DATABASE_PORT || 5432;

// Redis cache
const REDIS_HOST: string = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT: number = +process.env.REDIS_PORT || 6379;
const CACHE_TTL: number = +process.env.CACHE_TTL || 5;

// Bitcoin
const BITCOIN_NETWORK: string = process.env.BITCOIN_NETWORK || 'testnet';

// En
const ENCRYPTION_KEY: string = process.env.ENCRYPTION_KEY || 'secret';
const ENCRYPTION_ALGORITHM: string =
  process.env.ENCRYPTION_ALGORITHM || 'aes-256-cbc';
const ENCRYPTION_IV_LENGTH: number = +process.env.ENCRYPTION_IV_LENGTH || 16;

export {
  DATABASE_TYPE,
  DATABASE_HOST,
  DATABASE_NAME,
  DATABASE_USER,
  DATABASE_PASSWORD,
  DATABASE_PORT,
  REDIS_HOST,
  REDIS_PORT,
  CACHE_TTL,
  JWT_SECRET,
  BITCOIN_NETWORK,
  ENCRYPTION_KEY,
  ENCRYPTION_ALGORITHM,
  ENCRYPTION_IV_LENGTH,
  ENV,
};

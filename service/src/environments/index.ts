import * as dotenv from 'dotenv';

dotenv.config();

const NEED_TO_CONFIGURED = '';

const ENV: string = process.env.ENV || 'development';

const MODE = process.env.MODE || 'worker';

// JWT
const JWT_SECRET: string = process.env.JWT_SECRET || 'JWT_SECRET';

// ODR config
const ODR_URL: string = process.env.ODR_URL || 'localhost';
const ODR_PORT: number = +process.env.ODR_PORT || 18089;

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

// Encryption config
const ENCRYPTION_KEY: string = process.env.ENCRYPTION_KEY || 'secret';
const ENCRYPTION_ALGORITHM: string =
  process.env.ENCRYPTION_ALGORITHM || 'aes-256-cbc';
const ENCRYPTION_IV_LENGTH: number = +process.env.ENCRYPTION_IV_LENGTH || 16;

// Bitcoin config
const BITCOIN_NETWORK: string = process.env.BITCOIN_NETWORK || 'testnet';
const BTC_NETWORK: 'testnet' | 'mainnet' | 'livenet' = 'testnet';
const DUST_AMOUNT = 546;
const RUNE_TAG = 'R';
const MAGIC_NUMBER = 93;
const BASE_URL = 'http://222.253.82.244:8088';

const BITCOIN_RPC_HOST = process.env.BITCOIN_RPC_HOST || 'http://localhost';
const BITCOIN_RPC_PORT = Number(process.env.BITCOIN_RPC_PORT ?? 18332);
const BITCOIN_RPC_USER = process.env.BITCOIN_RPC_USER || 'mike';
const BITCOIN_RPC_PASS = process.env.BITCOIN_RPC_PASS || 'apd3g41pkl';
const BITCOIN_RPC_TIMEOUT = Number(process.env.BITCOIN_RPC_TIMEOUT ?? 120000);

// Config service fee
const SELLER_SERVICE_FEE = +process.env.SELLER_SERVICE_FEE || 0.005; // 1.5% service fee
const PLATFORM_SERVICE_FEE = +process.env.PLATFORM_SERVICE_FEE || 1000; // 1000 satoshi
const PLATFORM_FEE_ADDRESS =
  process.env.PLATFORM_FEE_ADDRESS ||
  'bc1pjm63zgy5l5y0wsmzqrsq3nrtt0hh8ud36766m3cmevg8ktvnqk7qunshc4';

// Config first rune block
const FIRST_RUNE_BLOCK = {
  mainnet: 767430,
  testnet: 2413343,
};

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
  BTC_NETWORK,
  PLATFORM_FEE_ADDRESS,
  DUST_AMOUNT,
  RUNE_TAG,
  BASE_URL,
  BITCOIN_RPC_HOST,
  BITCOIN_RPC_PORT,
  BITCOIN_RPC_USER,
  BITCOIN_RPC_PASS,
  BITCOIN_RPC_TIMEOUT,
  ODR_URL,
  ODR_PORT,
  MAGIC_NUMBER,
  SELLER_SERVICE_FEE,
  PLATFORM_SERVICE_FEE,
  FIRST_RUNE_BLOCK,
  MODE,
};

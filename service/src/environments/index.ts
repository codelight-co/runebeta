import * as dotenv from 'dotenv';

dotenv.config();

const NEED_TO_CONFIGURED = '';

// Database
const DATABASE_TYPE: string = process.env.DATABASE_TYPE || NEED_TO_CONFIGURED;
const DATABASE_HOST: string = process.env.DATABASE_HOST || NEED_TO_CONFIGURED;
const DATABASE_NAME: string = process.env.DATABASE_NAME || NEED_TO_CONFIGURED;
const DATABASE_USER: string = process.env.DATABASE_USER || NEED_TO_CONFIGURED;
const DATABASE_PASSWORD: string =
  process.env.DATABASE_PASSWORD || NEED_TO_CONFIGURED;
const DATABASE_PORT: number = +process.env.DATABASE_PORT || 5432;

export {
  DATABASE_TYPE,
  DATABASE_HOST,
  DATABASE_NAME,
  DATABASE_USER,
  DATABASE_PASSWORD,
  DATABASE_PORT,
};

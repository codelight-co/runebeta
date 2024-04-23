require("dotenv").config()
export const BTC_NETWORK: "testnet" | "mainnet" | "livenet" = "testnet"
export const PLATFORM_FEE_ADDRESS = ""
export const DUST_AMOUNT = 546
export const RUNE_TAG = "RUNE_TEST"
export const BASE_URL = "http://222.253.82.244:8088"
export const BITCOIN_RPC_HOST =
  process.env.BITCOIN_RPC_HOST || "http://localhost"
export const BITCOIN_RPC_PORT = Number(process.env.BITCOIN_RPC_PORT ?? 38332)
export const BITCOIN_RPC_USER = process.env.BITCOIN_RPC_USER || "__cookie__"
export const BITCOIN_RPC_PASS = process.env.BITCOIN_RPC_PASS || ""
export const BITCOIN_RPC_TIMEOUT = Number(
  process.env.BITCOIN_RPC_TIMEOUT ?? 120000,
)

export const BTC_NETWORK: "testnet" | "mainnet" | "livenet" = "testnet"
export const PLATFORM_FEE_ADDRESS = ""
export const DUST_AMOUNT = 546
export const RUNE_TAG = "R"
export const BASE_URL = "http://192.168.1.253:18332"
export const BITCOIN_RPC_HOST =
  process.env.BITCOIN_RPC_HOST || "http://192.168.1.253"
export const BITCOIN_RPC_PORT = Number(process.env.BITCOIN_RPC_PORT ?? 18332)
export const BITCOIN_RPC_USER = process.env.BITCOIN_RPC_USER || "mike"
export const BITCOIN_RPC_PASS = process.env.BITCOIN_RPC_PASS || "apd3g41pkl"
export const BITCOIN_RPC_TIMEOUT = Number(
  process.env.BITCOIN_RPC_TIMEOUT ?? 120000,
)

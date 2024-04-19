import * as bitcoin from 'bitcoinjs-lib';
import { IEdict } from 'runes-js';

export interface ListRunesResponse {
  entries: Map<RuneId, RuneItem>[];
}

export type RuneString = string;
export type RuneId = string;

// temporily use any
export interface RuneItem {
  burned: number;
  divisibility: number;
  etching: string;
  mint: any; // temporily use any
  mints: number;
  number: number;
  rune: RuneString;
  spacers: number;
  supply: number;
  symbol: string | null;
  timestamp: number;
}

export interface RuneResopnse {
  id: RuneId;
  parent: RuneItem | null;
  entry: RuneItem;
}

// market types

export interface IRuneListingState {
  seller: {
    makerFeeBp: number;
    sellerRuneAddress: string;
    price: number;
    runeItem: IRuneItem;
    sellerReceiveAddress: string;
    unsignedListingPSBTBase64?: string;
    signedListingPSBTBase64?: string;
    tapInternalKey?: string;
    publicKey?: string;
  };
  buyer?: {
    takerFeeBp: number;
    buyerAddress: string;
    buyerTokenReceiveAddress: string;
    feeRateTier: string;
    mergeTokenValue: boolean;
    buyerPublicKey?: string;
    unsignedBuyingPSBTBase64?: string;
    unsignedBuyingPSBTInputSize?: number;
    signedBuyingPSBTBase64?: string;
    itemMapping?: { index: number; id: number }[];
    buyerPaymentUTXOs?: IRuneUTXO[]; // after the selection
    mergedSignedBuyingPSBTBase64?: string;
  };
}

export interface IRunePostPSBTListing {
  price: number;
  id: number;
  sellerReceiveAddress: string;
  signedListingPSBTBase64: string;
  publicKey?: string;
  tapInternalKey?: string;
}

export interface IRuneItem {
  id: number;
  chain: string;
  owner: string;
  rune_utxo?: IRuneUTXO;
  mempool_utxo?: MempoolUtxo;

  outputValue: number;
  txid: string;
  vout: number;
  output: string;
  tokenValue: bigint;
  runeBalance: bigint;
  // listing
  // listed: boolean;
  // listedAt?: string;
  // listedPrice?: number;
  // listedMakerFeeBp?: number;
  // listedSellerReceiveAddress?: string;
}

export interface IRuneUTXO {
  txid: string;
  vout: number;
  value: number;
  script?: string;
  height?: number;
  runes?: IEdict[];
  ticker?: string;
  tx: bitcoin.Transaction;
}

export interface MempoolUtxo {
  txid: string;
  vout: number;
  status: {
    confirmed: true;
    block_height: number;
    block_hash: string;
    block_time: number;
  };
  value: number;
}

export interface utxo {
  txid: string;
  vout: number;
  value: number;
  status: TxStatus;
  tx: bitcoin.Transaction;
}

export interface WitnessUtxo {
  script: Buffer;
  value: number;
}

export interface TxStatus {
  confirmed: boolean;
  block_height: number;
  block_hash: string;
  block_time: number;
}

export class InvalidArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidArgumentError';
  }
}

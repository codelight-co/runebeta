import { AddressTxsUtxo } from '@mempool/mempool.js/lib/interfaces/bitcoin/addresses';
import * as bitcoin from 'bitcoinjs-lib';
import { IEdict } from 'rune_lib';

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

export interface ISelectPaymentUtxo {
  utxos: AddressTxsUtxo[];
  amount: number; // amount is expected total output (except tx fee)
  vinsLength: number;
  voutsLength: number;
  feeRateTier: string;
}

export class InvalidArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidArgumentError';
  }
}

export interface ITerms {
  amount: bigint | null;
  cap: bigint | null;
  height: Array<number | null>;
  offset: Array<number | null>;
}

export interface IEntry {
  block: bigint;
  burned: bigint;
  divisibility: bigint;
  etching: string;
  mints: bigint;
  remaining: bigint | null;
  number: bigint;
  premine: bigint;
  spaced_rune: string;
  symbol: null;
  timestamp: number;
  terms: ITerms;
}

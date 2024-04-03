import { AddressTxsUtxo } from '@mempool/mempool.js/lib/interfaces/bitcoin/addresses';
import * as bitcoin from 'bitcoinjs-lib';
import { utxo } from '../handlers/runes/types';
import { FullnodeRPC } from 'src/vendors/fullnoderpc';
import bs58check from 'bs58check';

export const toXOnly = (pubKey: Buffer) =>
  pubKey.length === 32 ? pubKey : pubKey.subarray(1, 33);

export const satToBtc = (sat: number) => sat / 100000000;
export const btcToSats = (btc: number) => btc * 100000000;

export function generateTxidFromHash(hash: Buffer) {
  return hash.reverse().toString('hex');
}

export async function mapUtxos(
  utxosFromMempool: AddressTxsUtxo[],
): Promise<utxo[]> {
  const ret: utxo[] = [];
  for (const utxoFromMempool of utxosFromMempool) {
    ret.push({
      txid: utxoFromMempool.txid,
      vout: utxoFromMempool.vout,
      value: utxoFromMempool.value,
      status: utxoFromMempool.status,
      tx: bitcoin.Transaction.fromHex(
        await FullnodeRPC.getrawtransaction(utxoFromMempool.txid),
      ),
    });
  }
  return ret;
}

export function isP2SHAddress(
  address: string,
  network: bitcoin.Network,
): boolean {
  try {
    const { version, hash } = bitcoin.address.fromBase58Check(address);
    return version === network.scriptHash && hash.length === 20;
  } catch (error) {
    return false;
  }
}

export enum AddressType {
  P2PKH,
  P2WPKH,
  P2TR,
  P2SH_P2WPKH,
}

export function getAddressType(
  address: string,
): [AddressType, bitcoin.Network] {
  if (address.startsWith('bc1q')) {
    return [AddressType.P2WPKH, bitcoin.networks.bitcoin];
  } else if (address.startsWith('bc1p')) {
    return [AddressType.P2TR, bitcoin.networks.bitcoin];
  } else if (address.startsWith('1')) {
    return [AddressType.P2PKH, bitcoin.networks.bitcoin];
  } else if (address.startsWith('3')) {
    return [AddressType.P2SH_P2WPKH, bitcoin.networks.bitcoin];
  }
  // testnet
  else if (address.startsWith('tb1q')) {
    return [AddressType.P2WPKH, bitcoin.networks.testnet];
  } else if (address.startsWith('m') || address.startsWith('n')) {
    return [AddressType.P2PKH, bitcoin.networks.testnet];
  } else if (address.startsWith('2')) {
    return [AddressType.P2SH_P2WPKH, bitcoin.networks.testnet];
  } else if (address.startsWith('tb1p')) {
    return [AddressType.P2TR, bitcoin.networks.testnet];
  }
  throw new Error(`Unknown address: ${address}`);
}

export function addressToP2PKH(address: string): string {
  const addressDecoded = bs58check.decode(address);
  const addressDecodedSub = Buffer.from(addressDecoded)
    .toString('hex')
    .substr(2);
  return `76a914${addressDecodedSub}88ac`;
}

export function addressToOutputScript(address: string): Buffer {
  const [addressType, network] = getAddressType(address);
  if (addressType === AddressType.P2PKH) {
    const p2pkh = addressToP2PKH(address);
    return Buffer.from(p2pkh, 'hex');
  } else {
    return bitcoin.address.toOutputScript(address, network);
  }
}

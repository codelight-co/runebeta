import { BTC_NETWORK } from './constant';
import * as bitcoin from 'bitcoinjs-lib';
import { ListRunesResponse, RuneResopnse } from './types';

export const network = BTC_NETWORK === 'mainnet' ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
export const headers = {
  Accept: 'application/json',
};

export class RPCService {
  constructor(public baseUrl: string, public network: bitcoin.Network = bitcoin.networks.testnet) {}
  public async listRunes(): Promise<ListRunesResponse> {
    const response = await fetch(`${this.baseUrl}/runes`, { headers });
    const runes = (await response.json()) as ListRunesResponse;
    return runes;
  }

  public async getRune(runeString: string): Promise<RuneResopnse> {
    const response = await fetch(`${this.baseUrl}/rune/${runeString}`, { headers });
    const rune = (await response.json()) as RuneResopnse;

    return rune;
  }
}

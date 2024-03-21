import * as bitcoin from 'bitcoinjs-lib';
import { ListRunesResponse, RuneResopnse } from '../interfaces/rune.interface';
import { BTC_NETWORK } from 'src/environments';

export const network =
  BTC_NETWORK === 'mainnet'
    ? bitcoin.networks.bitcoin
    : bitcoin.networks.testnet;
export const headers = {
  Accept: 'application/json',
};

export class RPCService {
  constructor(
    public baseUrl: string,
    public network: bitcoin.Network = bitcoin.networks.testnet,
  ) {}
  public async listRunes(): Promise<ListRunesResponse> {
    const response = await fetch(`${this.baseUrl}/runes`, { headers });
    const runes = (await response.json()) as ListRunesResponse;
    return runes;
  }

  public async getRune(runeString: string): Promise<RuneResopnse> {
    const response = await fetch(`${this.baseUrl}/rune/${runeString}`, {
      headers,
    });
    const rune = (await response.json()) as RuneResopnse;

    return rune;
  }
  public async getRuneByTxIdAndIndex(
    txId: string,
    index: number,
  ): Promise<RuneResopnse> {
    const response = await fetch(
      `${this.baseUrl}/rune/getRuneByTxIdAndIndex/${txId}:${index}`,
      { headers },
    );
    const rune = (await response.json()) as RuneResopnse;

    return rune;
  }
}

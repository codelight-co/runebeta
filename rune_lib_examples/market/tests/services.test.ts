import { BASE_URL } from '../src/configs/constant';
import { RPCService } from '../src/utils/rpc';
import * as bitcoin from 'bitcoinjs-lib';

describe('Services', () => {
  test('fetches runes', async () => {
    const runes = await new RPCService(BASE_URL, bitcoin.networks.testnet).listRunes();
    expect(runes.entries.length).toBeGreaterThan(0);
  });
  test('fetches rune detail', async () => {
    const runes = await new RPCService(BASE_URL, bitcoin.networks.testnet).getRune('AAAAAAAAAAAAAAAAAAAAAAAAAMZ');
    expect(runes.id).toBe('2582463:13');
  });
});

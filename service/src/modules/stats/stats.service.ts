import { HttpService } from '@nestjs/axios';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { Injectable, UseInterceptors } from '@nestjs/common';

@Injectable()
@UseInterceptors(CacheInterceptor)
export class StatsService {
  constructor(private readonly httpService: HttpService) {}

  async getBlockHeight() {
    const res = await this.httpService
      .get('https://api2.runealpha.xyz/stats/block-height')
      .toPromise();

    return res.data;
  }

  async getDailyTransactionCount() {
    const res = await this.httpService
      .get('https://api2.runealpha.xyz/stats/daily-tx-count')
      .toPromise();

    return res.data;
  }

  async getBlockSyncNumber() {
    const res = await this.httpService
      .get('https://api2.runealpha.xyz/stats/block-sync-number')
      .toPromise();

    return res.data;
  }

  async getBtcPrice() {
    const res = await this.httpService
      .get('https://api2.runealpha.xyz/stats/btc-price')
      .toPromise();

    return res.data;
  }

  async getStats() {
    const res = await this.httpService
      .get('https://api2.runealpha.xyz/stats')
      .toPromise();

    return res.data;
  }

  async getRecommendedFee() {
    const res = await this.httpService
      .get('https://mempool.space/api/v1/fees/recommended')
      .toPromise();

    return res.data;
  }
}

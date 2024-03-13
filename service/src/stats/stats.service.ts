import { Injectable } from '@nestjs/common';

@Injectable()
export class StatsService {
  async getBlockHeight() {
    // Get block height
    return 0;
  }

  async getDailyTransactionCount() {
    // Get daily transaction count
    return 0;
  }

  async getBlockSyncNumber() {
    // Get block sync number
    return 0;
  }

  async getBtcPrice() {
    // Get btc price
    return 0;
  }

  async getStats() {
    // Get protocol stats
    return {
      blockHeight: await this.getBlockHeight(),
      dailyTransactionCount: await this.getDailyTransactionCount(),
    };
  }
}

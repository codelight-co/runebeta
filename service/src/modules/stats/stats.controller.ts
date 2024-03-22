import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { StatsService } from './stats.service';
import { CoreTransformInterceptor } from 'src/common/interceptors/coreTransform.interceptor';

@Controller('stats')
@UseInterceptors(CoreTransformInterceptor)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  // Get protocol stats
  @Get()
  async getStats() {
    return this.statsService.getStats();
  }

  // Get block height
  @Get('block-height')
  async getBlockHeight() {
    return this.statsService.getBlockHeight();
  }

  // Get daily transaction count
  @Get('daily-tx-count')
  async getDailyTransactionCount() {
    return this.statsService.getDailyTransactionCount();
  }

  // Get btc price
  @Get('btc-price')
  async getBtcPrice() {
    return this.statsService.getBtcPrice();
  }

  // Get block sync number
  @Get('block-sync-number')
  async getBlockSyncNumber() {
    return this.statsService.getBlockSyncNumber();
  }

  // Get recommended fee
  @Get('recommended-fee')
  async getRecommendedFee() {
    return this.statsService.getRecommendedFee();
  }
}
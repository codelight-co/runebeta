import { HttpService } from '@nestjs/axios';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { Inject, Injectable, UseInterceptors } from '@nestjs/common';
import { ODR_PORT, ODR_URL } from 'src/environments';
import { Transaction } from '../database/entities/transaction.entity';
import { Repository } from 'typeorm';

@Injectable()
@UseInterceptors(CacheInterceptor)
export class StatsService {
  constructor(
    private readonly httpService: HttpService,
    @Inject('TRANSACTION_REPOSITORY')
    private transactionRepository: Repository<Transaction>,
  ) {}

  async getBlockHeight() {
    const res = await this.httpService
      .get(`${ODR_URL}:${ODR_PORT}/blockheight`)
      .toPromise();

    return res.data;
  }

  async getDailyTransactionCount(): Promise<string> {
    const res = await this.transactionRepository
      .createQueryBuilder('transaction')
      .innerJoinAndMapOne(
        'transaction.block',
        'transaction.block',
        'block',
        'block.block_height = transaction.block_height',
      )
      .select('COUNT(*)')
      .where(
        `date_trunc('day', to_timestamp(block.block_time)) = date_trunc('day', now())`,
      )
      .getRawOne();

    return res.count;
  }

  async getBlockSyncNumber() {
    const res = await this.httpService
      .get(`${ODR_URL}:${ODR_PORT}/blockcount`)
      .toPromise();

    return res.data;
  }

  async getBtcPrice() {
    const res = await this.httpService
      .get('https://api2.runealpha.xyz/stats/btc-price')
      .toPromise();

    return res.data?.data;
  }

  async getStats() {
    const res = await this.httpService
      .get('https://api2.runealpha.xyz/stats')
      .toPromise();

    return res.data?.data;
  }

  async getRecommendedFee() {
    const res = await this.httpService
      .get('https://mempool.space/api/v1/fees/recommended')
      .toPromise();

    return res.data;
  }
}

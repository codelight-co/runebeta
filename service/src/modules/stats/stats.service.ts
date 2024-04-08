import { HttpService } from '@nestjs/axios';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger, UseInterceptors } from '@nestjs/common';
import { ODR_PORT, ODR_URL } from 'src/environments';
import { Transaction } from '../database/entities/transaction.entity';
import { Repository } from 'typeorm';
import { TransactionRuneEntry } from '../database/entities/rune-entry.entity';

@Injectable()
@UseInterceptors(CacheInterceptor)
export class StatsService {
  constructor(
    private readonly httpService: HttpService,
    @Inject('TRANSACTION_REPOSITORY')
    private transactionRepository: Repository<Transaction>,
    @Inject('RUNE_ENTRY_REPOSITORY')
    private runeEntryRepository: Repository<TransactionRuneEntry>,
  ) {}

  private readonly logger = new Logger(StatsService.name);

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
    const totalRune = await this.runeEntryRepository.count();
    const totalFreeMintRune = await this.runeEntryRepository
      .createQueryBuilder('rune')
      .where(`mint_entry ->> 'cap' is null`)
      .getCount();
    const totalTransaction = await this.transactionRepository.count();
    const totalHolderData = await this.transactionRepository
      .query(`select count(*) as total
      from (
        select address
        from transaction_outs to2
        inner join outpoint_rune_balances orb on orb.tx_hash = to2.tx_hash
        where address is not null and spent = false
        group by address
      ) as rp`);
    let totalFee = 0;
    const totalFeeData = await this.transactionRepository.query(
      `select sum(price) from orders o`,
    );
    if (totalFeeData.length) {
      totalFee = parseInt(totalFeeData[0]?.sum) / 100000000;
    }

    return {
      totalRune,
      totalFreeMintRune,
      totalTransaction,
      totalFee,
      totalHolder: totalHolderData.length
        ? parseInt(totalHolderData[0]?.total)
        : 0,
      todayRateTransaction: 0,
    };
  }

  async getRecommendedFee() {
    const res = await this.httpService
      .get('https://mempool.space/api/v1/fees/recommended')
      .toPromise();

    return res.data;
  }

  async calculateNetworkStats() {
    this.logger.log('Calculating network stats...');
    const blockHeight = await this.getBlockHeight();

    const blockSyncNumber = await this.getBlockSyncNumber();
    const btcPrice = await this.getBtcPrice();
    const dailyTransactionCount = await this.getDailyTransactionCount();
    const stats = await this.getStats();
    const recommendedFee = await this.getRecommendedFee();

    return {
      blockHeight,
      blockSyncNumber,
      btcPrice,
      dailyTransactionCount,
      stats,
      recommendedFee,
    };
  }
}

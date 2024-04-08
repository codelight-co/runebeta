import { HttpService } from '@nestjs/axios';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger, UseInterceptors } from '@nestjs/common';
import { ODR_PORT, ODR_URL } from 'src/environments';
import { Transaction } from '../database/entities/transaction.entity';
import { Repository } from 'typeorm';
import { TransactionRuneEntry } from '../database/entities/rune-entry.entity';
import { RuneStat } from '../database/entities';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { PROCESS, PROCESSOR } from 'src/common/enums';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
@UseInterceptors(CacheInterceptor)
export class StatsService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly httpService: HttpService,
    @Inject('TRANSACTION_REPOSITORY')
    private transactionRepository: Repository<Transaction>,
    @Inject('RUNE_ENTRY_REPOSITORY')
    private runeEntryRepository: Repository<TransactionRuneEntry>,
    @Inject('RUNE_STAT_REPOSITORY')
    private runeStatRepository: Repository<RuneStat>,
    @InjectQueue(PROCESSOR.STAT_QUEUE) private statQueue: Queue,
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

  async calculateNetworkStats(): Promise<void> {
    const blockHeight = await this.getBlockHeight();
    const currentBlockHeight = await this.redis.get('currentBlockHeight');
    if (parseInt(currentBlockHeight) >= parseInt(blockHeight)) {
      return;
    }

    await this.redis.set('currentBlockHeight', blockHeight);
    this.logger.log(`Calculating network stats on block ${blockHeight} ...`);

    const runes = await this.runeEntryRepository.find({});
    for (let index = 0; index < runes.length; index++) {
      const rune = runes[index];
      await this.statQueue.add(
        PROCESS.STAT_QUEUE.CALCULATE_RUNE_STAT,
        {
          blockHeight,
          rune,
        },
        {
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    }

    return;
  }

  async calculateRuneStat(
    blockHeight: number,
    rune: TransactionRuneEntry,
  ): Promise<void> {
    const runeStats = await this.runeStatRepository.findOne({
      where: { rune_id: rune.rune_id },
    });
    const stats = (await this.runeStatRepository
      .query(`select 'total_transactions' as name, count(*) as total
from (
	select to2.tx_hash
	from transaction_outs to2 
	inner join outpoint_rune_balances orb on orb.tx_hash = to2.tx_hash and orb.vout = to2.vout 
	inner join transaction_rune_entries tre on tre.rune_id = orb.rune_id
	where tre.rune_id = '${rune.rune_id}'
	group  by to2.tx_hash
) as rp1
union all
select 'total_holders' as name, count(*) as total
from (
	select to2.address 
	from transaction_outs to2 
	inner join outpoint_rune_balances orb on orb.tx_hash = to2.tx_hash and orb.vout = to2.vout 
	inner join transaction_rune_entries tre on tre.rune_id = orb.rune_id
	where tre.rune_id = '${rune.rune_id}' and CAST(orb.balance_value  AS DECIMAL) > 0 and to2.spent = false 
	group  by to2.address
) as rp2`)) as Array<{ name: string; total: number }>;
    const payload = {} as any;
    for (let index = 0; index < stats.length; index++) {
      const stat = stats[index];
      payload[stat.name] = stat.total;
      await this.runeStatRepository.save({
        id: runeStats?.id,
        rune_id: rune.rune_id,
        ...payload,
      });
    }

    return;
  }
}

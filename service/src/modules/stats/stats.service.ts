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
import { IndexersService } from '../indexers/indexers.service';
import { run } from 'node:test';

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
    private readonly indexersService: IndexersService,
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
    try {
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
    } catch (error) {
      this.logger.error('Error calculating network stats', error);
    }
  }

  async calculateRuneStat(
    blockHeight: number,
    rune: TransactionRuneEntry,
  ): Promise<void> {
    try {
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
      }

      const runeIndex = await this.indexersService.getRuneDetails(rune.rune_id);
      const premine = runeIndex?.entry.premine
        ? BigInt(runeIndex?.entry.premine)
        : BigInt(0);
      const mints = runeIndex?.entry.mints
        ? BigInt(runeIndex?.entry.mints)
        : BigInt(0);
      const burned = BigInt(runeIndex?.entry.burned);
      const amount = runeIndex?.entry.terms?.amount
        ? BigInt(runeIndex?.entry.terms?.amount)
        : BigInt(0);
      const supply = premine + mints * amount;
      const mint_type = runeIndex?.entry?.terms ? 'fairmint' : 'fixed-cap';
      const limit = amount;
      const cap = runeIndex?.entry?.terms?.cap
        ? BigInt(runeIndex?.entry?.terms?.cap)
        : BigInt(0);
      let remaining = BigInt(0);
      if (mints > 0) {
        remaining = BigInt(cap) - BigInt(mints);
      }

      let term = 0;
      if (
        runeIndex?.entry?.terms?.height &&
        runeIndex?.entry?.terms?.height.length > 1
      ) {
        term = runeIndex?.entry?.terms?.height[1];
      } else if (
        runeIndex?.entry?.offset?.length === 2 &&
        runeIndex?.entry?.offset[1] > 0
      ) {
        term = runeIndex?.entry?.offset[1];
      }

      // Calculate market stats
      let total_volume = BigInt(0);
      const dataVolume = await this.transactionRepository
        .query(`select sum((rune_item ->> 'tokenValue')::int) as total
      from orders o 
      where rune_id = '${rune.rune_id}' and status = 'completed'
      group by rune_id`);
      if (dataVolume.length) {
        total_volume = BigInt(dataVolume[0]?.total);
      }
      let volume_24h = BigInt(0);
      const dataVolume24h = await this.transactionRepository
        .query(`select sum((rune_item ->> 'tokenValue')::int) as total
      from orders o 
      where rune_id = '${rune.rune_id}' and status = 'completed' and created_at >= now() - interval '24 hours'
      group by rune_id`);
      if (dataVolume24h.length) {
        volume_24h = BigInt(dataVolume24h[0]?.total);
      }
      let prev_volume_24h = BigInt(0);
      const dataPrevVolume24h = await this.transactionRepository.query(
        `select volume_24h as total  from rune_stats rs  where rune_id  = '${rune.rune_id}'`,
      );
      if (dataPrevVolume24h.length) {
        prev_volume_24h =
          BigInt(dataPrevVolume24h[0]?.total) === BigInt(0)
            ? volume_24h
            : BigInt(dataPrevVolume24h[0]?.total);
      }
      const diffVolume = volume_24h - prev_volume_24h;
      const change_24h =
        diffVolume === BigInt(0)
          ? BigInt(0)
          : (diffVolume * BigInt(100)) / prev_volume_24h;
      let price = BigInt(0);
      const dataPrice = await this.transactionRepository.query(`
      select price 
      from orders o 
      where rune_id = '${rune.rune_id}' and status in ('listing','completed')
      order by price asc
      limit 1
      `);
      if (dataPrice.length) {
        price = BigInt(dataPrice[0]?.price);
      }

      let ma_price = BigInt(0);
      const dataMAPrice = await this.transactionRepository
        .query(`select (sum(medium_price)/count(*))::integer as price 
        from (
          select DATE_TRUNC('day', created_at) AS date, AVG(price) AS medium_price
          from orders o
          where rune_id = '${rune.rune_id}' and status = 'completed' and created_at >= current_date - interval '6 days' 
          group by date
          order by date desc
        ) as rp`);
      let market_cap = BigInt(0);
      if (dataMAPrice.length) {
        ma_price = BigInt(dataMAPrice[0]?.price || 0);
        market_cap = BigInt(dataMAPrice[0].price || 0) * supply;
      }

      let order_sold = BigInt(0);
      const dataOrderSold = await this.transactionRepository.query(
        `select count(*) as total from orders o where rune_id = '${rune.rune_id}' and status = 'completed'`,
      );
      if (dataOrderSold.length) {
        order_sold = BigInt(dataOrderSold[0]?.total);
      }

      await this.runeStatRepository.save(
        new RuneStat({
          id: runeStats?.id,
          rune_id: rune.rune_id,
          total_supply: supply,
          total_mints: mints,
          total_burns: burned,
          change_24h,
          volume_24h,
          prev_volume_24h,
          price,
          ma_price,
          order_sold,
          total_volume,
          market_cap,
          mintable: runeIndex?.mintable || false,
          term,
          start_block:
            runeIndex?.entry?.terms?.height &&
            runeIndex?.entry?.terms?.height.length > 0
              ? runeIndex?.entry?.terms?.height[0]
              : 0,
          end_block:
            runeIndex?.entry?.terms?.height &&
            runeIndex?.entry?.terms?.height.length > 1
              ? runeIndex?.entry?.terms?.height[1]
              : 0,
          height: runeIndex?.entry?.terms?.height || [],
          offset: runeIndex?.entry?.terms?.offset || [],
          entry: runeIndex?.entry || null,
          limit,
          premine,
          remaining,
          mint_type,
          ...payload,
        }),
      );
    } catch (error) {
      this.logger.error('Error calculating rune stat', error);
    }
  }
}

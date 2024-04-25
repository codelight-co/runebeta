import { HttpService } from '@nestjs/axios';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger, UseInterceptors } from '@nestjs/common';
import { ODR_PORT, ODR_URL } from 'src/environments';
import { Transaction } from '../database/entities/indexer/transaction.entity';
import { Repository } from 'typeorm';
import { TransactionRuneEntry } from '../database/entities/indexer/rune-entry.entity';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { PROCESS, PROCESSOR } from 'src/common/enums';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { IndexersService } from '../indexers/indexers.service';
import { getFeesRecommended } from 'src/vendors/mempool';
import { FeesRecommended } from '@mempool/mempool.js/lib/interfaces/bitcoin/fees';
import { TxidRune } from '../database/entities/indexer/txid-rune.entity';
import { Order } from '../database/entities/marketplace/order.entity';
import { RuneStat } from '../database/entities/marketplace/rune_stat.entity';
import * as dayjs from 'dayjs';

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
    @Inject('ORDER_REPOSITORY')
    private orderRepository: Repository<Order>,
    @Inject('TX_ID_RUNE_REPOSITORY')
    private txidRuneRepository: Repository<TxidRune>,
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

  async getDailyTransactionCount(): Promise<any> {
    const res = await this.transactionRepository.query(`
    select DATE_TRUNC('day', to_timestamp(b.block_time)) as date, count(t.id) as total 
    from transactions t
    inner join blocks b on b.block_height = t.block_height
    where  to_timestamp(b.block_time) >= current_date - interval '6 days' 
    group by date
    order by date asc`);

    const data = [];
    const labels = [];
    for (let index = 0; index < res.length; index++) {
      const item = res[index];
      data.push(parseInt(item.total));
      labels.push(dayjs(item.date).format('MM/DD'));
    }

    return { data, labels };
  }

  async getBlockSyncNumber() {
    const res = await this.httpService
      .get(`${ODR_URL}:${ODR_PORT}/blockheight`)
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
      .where(`terms ->> 'cap' is null`)
      .getCount();
    const totalTransaction = await this.txidRuneRepository.count();
    const totalHolderData = await this.transactionRepository
      .query(`select count(*) as total
      from (
        select orb.address
        from outpoint_rune_balances orb
        where orb.address is not null
        group by orb.address
      ) as rp`);
    let totalFee = 0;
    const totalFeeData = await this.orderRepository.query(
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

  async getRecommendedFee(): Promise<FeesRecommended> {
    return getFeesRecommended();
  }

  async deleteDuplicateTxRune(): Promise<any> {
    const query = `select tx_hash, count(tx_hash) as total, jsonb_agg(id) as ids
        from txid_runes tr
        group by tx_hash 
        having count(tx_hash) > 1`;
    const result = await this.transactionRepository.query(query);
    if (result.length) {
      // Get id beteween 1 and n
      const removeIDs = result
        .map((item: any) => {
          const ids = item.ids.filter((id: any) => id !== item.ids[0]);
          return ids;
        })
        .flat();
      this.logger.log(`Removing duplicate txid_runes ${removeIDs.length}`);

      // Loop each 1000 record
      const ids = [];
      const removeIDsLength = removeIDs.length / 1000;
      for (let index = 0; index < removeIDsLength; index++) {
        const start = index * 1000;
        const end = start + 1000;
        const partIDs = removeIDs.slice(start, end).map((item: any) => item);

        ids.push(partIDs);
      }

      // Remove duplicate txid_runes
      for (let index = 0; index < ids.length; index++) {
        const partIDs = ids[index];
        await this.transactionRepository.query(
          `delete from txid_runes where id in (${partIDs.join(',')})`,
        );
      }
    }

    return { total: result.length };
  }

  async getBlockIndex(): Promise<number> {
    let blockHeight = null;

    try {
      blockHeight = await this.indexersService.getBlockIndex();
    } catch (error) {
      this.logger.error('Error getting block index', error);
    }

    if (!blockHeight) {
      try {
        blockHeight = await this.indexersService.getBlockHeight(false);
      } catch (error) {
        this.logger.error('Error getting block height', error);
        return;
      }
    }

    return parseInt(blockHeight);
  }

  async getCurrentBlockIndex(): Promise<number> {
    const currentBlockHeight = await this.redis.get('currentBlockHeight');
    if (currentBlockHeight) {
      return parseInt(currentBlockHeight);
    }

    return null;
  }

  async calculateNetworkStats(): Promise<void> {
    const blockHeight = await this.getBlockIndex();
    const currentBlockHeight = await this.getCurrentBlockIndex();
    if (currentBlockHeight >= blockHeight) {
      return;
    }

    await this.redis.set('currentBlockHeight', blockHeight);
    this.logger.log(`Calculating network stats on block ${blockHeight} ...`);

    try {
      let runeIds = [];

      if (!currentBlockHeight) {
        const runes = await this.runeEntryRepository.find();
        if (runes?.length) {
          runeIds = runes.map((rune) => rune.rune_id);
        }
      } else {
        // Get changes in rune stats
        const runeChanges = await this.transactionRepository.query(`
      select jsonb_agg(rune_id) as ids
      from (
        select rune_id
          from outpoint_rune_balances orb 
          where rune_id is not null and block_height = ${blockHeight}
          group by rune_id
      ) as rb
    `);
        if (runeChanges?.length && runeChanges[0]?.ids?.length) {
          runeIds = runeChanges[0]?.ids;
        }
      }

      if (runeIds?.length) {
        for (let index = 0; index < runeIds.length; index++) {
          const id = runeIds[index];
          await this.statQueue.add(
            PROCESS.STAT_QUEUE.CALCULATE_RUNE_STAT,
            {
              blockHeight,
              rune: { rune_id: id },
            },
            {
              jobId: `${id}`,
              attempts: 0,
              backoff: 0,
              removeOnComplete: true,
              removeOnFail: true,
            },
          );
        }
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
      const query = `select 'total_transactions' as name, count(*) as total
from (
	select orb.tx_hash
	from outpoint_rune_balances orb
	inner join transaction_rune_entries tre on tre.rune_id = orb.rune_id
	where tre.rune_id = '${rune.rune_id}'
	group  by orb.tx_hash
) as rp1
union all
select 'total_holders' as name, count(*) as total
from (
	select orb.address 
	from outpoint_rune_balances orb
	inner join transaction_rune_entries tre on tre.rune_id = orb.rune_id
	where tre.rune_id = '${rune.rune_id}' and CAST(orb.balance_value  AS DECIMAL) > 0
	group  by orb.address
) as rp2`;

      this.logger.log(`Calculating rune stat ${rune.rune_id} ...`);

      const [runeStats, stats, runeIndex] = await Promise.all([
        this.runeStatRepository.findOne({
          where: { rune_id: rune.rune_id },
        }),
        this.transactionRepository.query(query),
        this.indexersService.getRuneDetails(rune.rune_id),
      ]);
      if (runeIndex) {
        // Cache rune details
        await this.redis.set(
          `rune-info:${rune.rune_id}`,
          JSON.stringify(runeIndex),
        );
      }

      const payload = {} as any;
      for (let index = 0; index < stats.length; index++) {
        const stat = stats[index];
        payload[stat.name] = stat.total;
      }

      const block = runeIndex?.entry?.block || BigInt(0);
      const rune_name = runeIndex?.entry?.spaced_rune
        ? String(runeIndex?.entry?.spaced_rune).replaceAll('•', '')
        : '';
      const number = runeIndex?.entry?.number || BigInt(0);
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
      const dataVolume = await this.orderRepository
        .query(`select sum((rune_item ->> 'tokenValue')::int) as total
      from orders o 
      where rune_id = '${rune.rune_id}' and status = 'completed'
      group by rune_id`);
      if (dataVolume.length) {
        total_volume = BigInt(dataVolume[0]?.total);
      }
      let volume_24h = BigInt(0);
      const dataVolume24h = await this.orderRepository
        .query(`select sum((rune_item ->> 'tokenValue')::int) as total
      from orders o 
      where rune_id = '${rune.rune_id}' and status = 'completed' and created_at >= now() - interval '24 hours'
      group by rune_id`);
      if (dataVolume24h.length) {
        volume_24h = BigInt(dataVolume24h[0]?.total);
      }
      let prev_volume_24h = BigInt(0);
      const dataPrevVolume24h = await this.runeStatRepository.query(
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
          : prev_volume_24h > BigInt(0)
            ? (diffVolume * BigInt(100)) / prev_volume_24h
            : BigInt(0);
      let price = BigInt(0);
      const dataPrice = await this.orderRepository.query(`
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
      const dataMAPrice = await this.orderRepository
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
      const dataOrderSold = await this.orderRepository.query(
        `select count(*) as total from orders o where rune_id = '${rune.rune_id}' and status = 'completed'`,
      );
      if (dataOrderSold.length) {
        order_sold = BigInt(dataOrderSold[0]?.total);
      }
      await this.runeStatRepository.save(
        new RuneStat({
          id: runeStats?.id,
          rune_id: rune.rune_id,
          rune_name,
          total_supply: supply,
          total_mints: mints,
          total_burns: burned,
          change_24h,
          volume_24h,
          prev_volume_24h,
          block,
          price,
          ma_price,
          order_sold,
          total_volume,
          market_cap,
          mintable: runeIndex?.mintable || false,
          term,
          number,
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
          etching: runeIndex?.entry.etching,
          parent: runeIndex?.parent,
          ...payload,
        }),
      );
    } catch (error) {
      this.logger.error(rune.rune_id, 'Error calculating rune stat', error);
    }
  }
}

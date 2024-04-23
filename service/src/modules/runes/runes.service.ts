import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { RuneFilterDto } from './dto';
import { Repository } from 'typeorm';
import { TransactionRuneEntry } from '../database/entities/indexer/rune-entry.entity';
import { EtchRuneDto } from './dto/etch-rune-filter.dto';
import { EtchRune, RuneStat } from '../database/entities/indexer';
import { User } from '../database/entities/marketplace/user.entity';
import { EEtchRuneStatus } from 'src/common/enums';
import { StatsService } from '../stats/stats.service';
import { TransactionsService } from '../transactions/transactions.service';
import { BroadcastTransactionDto } from '../transactions/dto';
import { IndexersService } from '../indexers/indexers.service';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class RunesService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheService: Cache,
    private readonly statsService: StatsService,
    private readonly transactionsService: TransactionsService,
    @Inject('RUNE_ENTRY_REPOSITORY')
    private runeEntryRepository: Repository<TransactionRuneEntry>,
    @Inject('ETCH_RUNE_REPOSITORY')
    private etchRuneEntryRepository: Repository<EtchRune>,
    @Inject('RUNE_STAT_REPOSITORY')
    private runeStatRepository: Repository<RuneStat>,
    private readonly indexersService: IndexersService,
  ) {}

  private logger = new Logger(RunesService.name);

  async getRunes(runeFilterDto: RuneFilterDto): Promise<any> {
    const blockHeight = await this.indexersService.getBlockHeight();
    const cachedData = await this.cacheService.get(
      `${blockHeight}:list-rune:${Object.values(runeFilterDto).join('-')}`,
    );
    if (cachedData) {
      return cachedData;
    }

    const builder = this.runeStatRepository
      .createQueryBuilder('rune_stat')
      .offset(runeFilterDto.offset)
      .limit(runeFilterDto.limit);

    if (runeFilterDto.type) {
      builder.where(`rune_stat.mint_type = :type`, {
        type: runeFilterDto.type,
      });
    }
    if (runeFilterDto.search) {
      const search = runeFilterDto.search.replace(/•/g, '');
      builder.andWhere(`rune_stat.rune_name ILIKE '%${search}%'`);
    }
    if (runeFilterDto.sortBy) {
      switch (runeFilterDto.sortBy) {
        case 'supply':
          builder.orderBy(
            `rune_stat.total_supply`,
            runeFilterDto.sortOrder?.toLocaleUpperCase() === 'DESC'
              ? 'DESC'
              : 'ASC',
          );
          break;

        case 'holders':
          builder.orderBy(
            `rune_stat.total_holders`,
            runeFilterDto.sortOrder?.toLocaleUpperCase() === 'DESC'
              ? 'DESC'
              : 'ASC',
          );
          break;

        case 'transactions':
          builder.orderBy(
            `rune_stat.total_transactions`,
            runeFilterDto.sortOrder?.toLocaleUpperCase() === 'DESC'
              ? 'DESC'
              : 'ASC',
          );
          break;

        case 'created_at':
          builder.orderBy(
            `rune_stat.rune_id`,
            runeFilterDto.sortOrder?.toLocaleUpperCase() === 'DESC'
              ? 'DESC'
              : 'ASC',
          );
          break;

        default:
          builder.orderBy(
            `rune_stat.rune_id`,
            runeFilterDto.sortOrder?.toLocaleUpperCase() === 'DESC'
              ? 'DESC'
              : 'ASC',
          );
          break;
      }
    } else {
      builder.orderBy(`rune_stat.rune_id`, 'ASC');
    }

    const runes = await builder.getMany();
    const runeIds = runes.map((rune) => rune.rune_id);
    const runeEntries = {};
    if (runeIds.length) {
      const arrRuneEntries = await this.runeEntryRepository
        .createQueryBuilder('rune')
        .where('rune.rune_id IN (:...runeIds)', { runeIds })
        .getMany();
      for (let index = 0; index < arrRuneEntries.length; index++) {
        const entry = arrRuneEntries[index];
        runeEntries[entry.rune_id] = entry;
      }
    }

    const result = {
      total: await builder.getCount(),
      limit: runeFilterDto.limit,
      offset: runeFilterDto.offset,
      runes: runes.map((rune) => ({
        id: rune.id,
        rune_id: rune.rune_id,
        rune_hex: runeEntries[rune.rune_id]?.rune_hex,
        supply: runeEntries[rune.rune_id]?.supply || 0,
        deploy_transaction: runeEntries[rune.rune_id]?.etching,
        divisibility: runeEntries[rune.rune_id]?.divisibility,
        start_block:
          runeEntries[rune.rune_id]?.terms?.height?.length === 2
            ? runeEntries[rune.rune_id]?.terms?.height[0]
            : null,
        end_block:
          runeEntries[rune.rune_id]?.terms?.height?.length === 2
            ? runeEntries[rune.rune_id]?.terms?.height[1]
            : null,
        holder_count: rune?.total_holders || '0',
        rune: runeEntries[rune.rune_id]?.spaced_rune,
        symbol: runeEntries[rune.rune_id]?.symbol,
        premine: runeEntries[rune.rune_id]?.premine || '0',
        timestamp: runeEntries[rune.rune_id]?.timestamp || 1000,
        transaction_count: rune?.total_transactions || '0',
        mint_type: runeEntries[rune.rune_id]?.mint_type || '',
        terms: runeEntries[rune.rune_id]?.terms || null,
        etching: runeEntries[rune.rune_id]?.etching || null,
        parent: rune?.parent || null,
        mints: runeEntries[rune.rune_id]?.mints || '0',
        remaining: runeEntries[rune.rune_id]?.remaining || null,
        burned: runeEntries[rune.rune_id]?.burned || '0',
        limit: runeEntries[rune.rune_id]?.terms?.amount || '0',
        mintable: runeEntries[rune.rune_id]?.mintable || false,
      })),
    };

    await this.cacheService.set(
      `${blockHeight}:list-rune:${Object.values(runeFilterDto).join('-')}`,
      result,
      900,
    );

    return result;
  }

  async getRuneById(id: string): Promise<any> {
    const [rune, runeStat] = await Promise.all([
      this.runeEntryRepository
        .createQueryBuilder('rune')
        .where('rune.rune_id = :id', { id })
        .getOne(),
      this.runeStatRepository
        .createQueryBuilder('rune_stat')
        .where('rune_stat.rune_id = :id', { id })
        .getOne(),
    ]);
    if (!rune) {
      throw new BadRequestException('Rune not found');
    }

    return {
      rows: {
        id: rune.id,
        rune_id: rune.rune_id,
        rune_hex: rune?.rune_hex,
        supply: runeStat?.total_supply || rune.supply || 0,
        deploy_transaction: rune.etching,
        divisibility: rune.divisibility,
        start_block:
          rune?.terms?.height?.length === 2 ? rune?.terms?.height[0] : null,
        end_block:
          rune?.terms?.height?.length === 2 ? rune?.terms?.height[1] : null,
        holder_count: runeStat?.total_holders || '0',
        rune: rune.spaced_rune,
        symbol: rune.symbol,
        premine: rune?.premine || '0',
        timestamp: rune.timestamp,
        transaction_count: runeStat?.total_transactions || '0',
        mint_type: rune?.mint_type || '',
        terms: rune?.terms || null,
        etching: rune?.etching || null,
        parent: runeStat?.parent || null,
        mints: rune?.mints || '0',
        remaining: rune?.remaining || null,
        burned: rune?.burned || '0',
        limit: rune?.terms?.amount || '0',
        mintable: rune?.mintable || false,
      },
    };
  }

  async getTopHolders(id: string): Promise<any> {
    const data = await this.runeEntryRepository.query(`
    select orb.address, sum(orb.balance_value) as amount, min(tre.spaced_rune) as spaced_rune, min(tre.rune_id) as rune_id 
    from outpoint_rune_balances orb
    inner join transaction_rune_entries tre on tre.rune_id = orb.rune_id 
    where orb.address is not null and tre.rune_id = '${id}'
    group by orb.address 
    order by amount desc
    limit 10`);

    return {
      topAddress: data.map((d: any) => ({
        address: d.address,
        amount: d.amount,
        rune_id: d.rune_id,
      })),
    };
  }

  async getRuneByRuneIDs(runeIDs: string[]): Promise<any> {
    return this.runeEntryRepository
      .createQueryBuilder()
      .where('rune_id IN (:...runeIDs)', { runeIDs })
      .getMany();
  }

  async etchRune(user: User, etchRuneDto: EtchRuneDto): Promise<any> {
    const rune = await this.etchRuneEntryRepository.save({
      name: etchRuneDto.runeName || '',
      commit_block_height: etchRuneDto.commitBlockHeight,
      mint_block_height: etchRuneDto.commitBlockHeight + 6,
      mint_tx_hex: etchRuneDto.revealTxRawHex,
      user_id: user.id,
      status: EEtchRuneStatus.COMMITTED,
    });

    return rune;
  }

  async processEtching(): Promise<void> {
    try {
      const currentBlockHeight = await this.statsService.getBlockHeight();
      if (currentBlockHeight) {
        const etchRunes = await this.etchRuneEntryRepository
          .createQueryBuilder('rune')
          .where('rune.mint_block_height <= :currentBlockHeight', {
            currentBlockHeight,
          })
          .andWhere('rune.status = :status', {
            status: EEtchRuneStatus.COMMITTED,
          })
          .getMany();
        if (etchRunes.length) {
          for (const etchRune of etchRunes) {
            try {
              this.logger.log('Processing etching', etchRune.id);
              const tx = await this.transactionsService.broadcastTransaction({
                rawTransaction: etchRune.mint_tx_hex,
              } as BroadcastTransactionDto);

              console.log('tx :>> ', tx);
              await this.etchRuneEntryRepository.update(etchRune.id, {
                mint_tx_id: tx?.result || '',
                status: EEtchRuneStatus.MINTED,
              });
            } catch (error) {
              this.logger.error('Error processing etching', error);

              await this.etchRuneEntryRepository.update(etchRune.id, {
                status: EEtchRuneStatus.FAILED,
              });
            }
          }
        }
      } else {
        this.logger.log('Cant not get block number');
      }
    } catch (error) {
      this.logger.error('Error processing etching', error);
    }
  }

  async getRuneUtxo(address: string): Promise<any> {
    const blockHeight = await this.indexersService.getBlockHeight();
    const cachedData = await this.cacheService.get(
      `${blockHeight}:rune-utxo:${address}`,
    );
    if (cachedData) {
      return cachedData;
    }

    const data = await this.runeEntryRepository.query(`
    select to2.tx_hash as utxo_tx_hash, to2.vout as utxo_vout, to2.value as utxo_value, tre.* ,orb.*, rs.*
    from transaction_outs to2 
    inner join outpoint_rune_balances orb on orb.tx_hash = to2.tx_hash and orb.vout = to2.vout
    inner join transaction_rune_entries tre on tre.rune_id = orb.rune_id
    left join rune_stats rs on rs.rune_id = tre.rune_id
    where orb.address is not null and to2.address = '${address}'
    order by orb.balance_value desc`);

    const result = data.map((d: any) => ({
      address: d.address,
      amount: d.balance_value,
      id: d.id,
      rune_id: d.rune_id,
      utxo: {
        tx_hash: d.utxo_tx_hash,
        vout: d.utxo_vout,
        value: d.utxo_value,
      },
      rune: {
        id: d.id,
        rune_id: d.rune_id,
        deploy_transaction: d.etching,
        divisibility: d.divisibility,
        end_block: d?.end_block,
        start_block: d?.start_block,
        mints: d?.entry?.mints,
        terms: d?.entry?.terms,
        turbo: d?.entry?.turbo,
        burned: d?.entry?.burned,
        premine: d?.entry?.premine,
        rune: d.spaced_rune,
        symbol: d.symbol ? d.symbol : '¤',
        timestamp: d.timestamp,
      },
    }));

    await this.cacheService.set(
      `${blockHeight}:rune-utxo:${address}`,
      result,
      900,
    );

    return result;
  }

  async selectRuneUtxo(
    address: string,
    dto: { amount: bigint; rune_id: string },
  ): Promise<any> {
    const runeUtxos = await this.getRuneUtxo(address);
    const selectedUtxos = [];
    let total = BigInt(0);
    for (const utxo of runeUtxos) {
      if (utxo.rune.rune_id !== dto.rune_id) {
        continue;
      }

      const amount = BigInt(utxo.amount);
      if (total < BigInt(dto.amount)) {
        total += amount;
        selectedUtxos.push(utxo);
      }
    }

    if (total < dto.amount) {
      throw new BadRequestException('Not enough balance');
    }

    return selectedUtxos;
  }
}

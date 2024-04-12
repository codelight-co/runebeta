import { Inject, Injectable, Logger } from '@nestjs/common';
import { RuneFilterDto } from './dto';
import { Repository } from 'typeorm';
import { TransactionRuneEntry } from '../database/entities/rune-entry.entity';
import { EtchRuneDto } from './dto/etch-rune-filter.dto';
import { EtchRune, RuneStat } from '../database/entities';
import { User } from '../database/entities/user.entity';
import { EEtchRuneStatus } from 'src/common/enums';
import { StatsService } from '../stats/stats.service';
import { TransactionsService } from '../transactions/transactions.service';
import { BroadcastTransactionDto } from '../transactions/dto';

@Injectable()
export class RunesService {
  constructor(
    private readonly statsService: StatsService,
    private readonly transactionsService: TransactionsService,
    @Inject('RUNE_ENTRY_REPOSITORY')
    private runeEntryRepository: Repository<TransactionRuneEntry>,
    @Inject('ETCH_RUNE_REPOSITORY')
    private etchRuneEntryRepository: Repository<EtchRune>,
  ) {}

  private logger = new Logger(RunesService.name);

  async getRunes(runeFilterDto: RuneFilterDto): Promise<any> {
    const builder = this.runeEntryRepository
      .createQueryBuilder('rune')
      .innerJoinAndMapOne(
        'rune.stat',
        RuneStat,
        'rune_stat',
        'rune_stat.rune_id = rune.rune_id',
      )
      .offset(runeFilterDto.offset)
      .limit(runeFilterDto.limit);

    if (runeFilterDto.type) {
      builder.where(`rune_stat.mint_type = :type`, {
        type: runeFilterDto.type,
      });
    }

    if (runeFilterDto.search) {
      builder.andWhere(`rune.spaced_rune ILIKE :search`, {
        search: `%${runeFilterDto.search.split(' ').join('_')}%`,
      });
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
            `rune.timestamp`,
            runeFilterDto.sortOrder?.toLocaleUpperCase() === 'DESC'
              ? 'DESC'
              : 'ASC',
          );
          break;

        default:
          break;
      }
    }

    const runes = await builder.getMany();

    return {
      total: await builder.getCount(),
      limit: runeFilterDto.limit,
      offset: runeFilterDto.offset,
      runes: runes.map((rune) => ({
        id: rune.id,
        rune_id: rune.rune_id,
        rune_hex: rune.rune_hex,
        supply: rune?.stat?.total_supply || rune.supply || 0,
        deploy_transaction: rune.tx_hash,
        divisibility: rune.divisibility,
        end_block: rune.number,
        holder_count: rune?.stat?.total_holders || '0',
        rune: rune.spaced_rune,
        symbol: rune.symbol,
        premine: rune?.stat?.premine || '0',
        term: rune?.stat?.term || 0,
        timestamp: rune.timestamp,
        transaction_count: rune?.stat?.total_transactions || '0',
        mint_type: rune?.stat?.mint_type || '',
        terms: rune?.stat?.entry?.terms || null,
        mints: rune?.stat?.total_mints || '0',
        remaining: rune?.stat?.entry.remaining || null,
        burned: rune?.stat?.total_burns || '0',
        limit: rune?.stat?.limit || '0',
        mintable: rune?.stat?.mintable || false,
      })),
    };
  }

  async getRuneById(id: string): Promise<any> {
    const rune = await this.runeEntryRepository
      .createQueryBuilder()
      .where('rune_id = :id', { id })
      .getOne();

    return {
      rows: {
        id: rune.id,
        rune_id: rune.rune_id,
        supply: rune.supply,
        token_holders: 0,
        burned: rune.burned,
        collection_description: null,
        collection_metadata: null,
        collection_minted: 0,
        collection_owner: null,
        collection_total_supply: null,
        deploy_transaction: rune.tx_hash,
        divisibility: rune.divisibility,
        end_block: rune.number,
        holder_count: 0,
        is_collection: false,
        is_hot: true,
        is_nft: false,
        limit: 0,
        nft_collection: null,
        nft_metadata: null,
        rune: rune.spaced_rune,
        symbol: rune.symbol,
        term: 0,
        timestamp: rune.timestamp,
        transaction_count: 0,
        unit: 1,
      },
    };
  }

  async getTopHolders(id: string): Promise<any> {
    const data = await this.runeEntryRepository.query(`
    select to2.address, tre.spaced_rune ,orb.*
    from transaction_outs to2 
    inner join outpoint_rune_balances orb on orb.tx_hash = to2.tx_hash
    inner join transaction_rune_entries tre on tre.rune_id = orb.rune_id 
    where spent = false and to2.address is not null and tre.rune_id = '${id}'
    order by balance_value desc
    limit 10`);

    return {
      topAddress: data.map((d: any) => ({
        address: d.address,
        amount: d.balance_value,
        id: d.id,
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
    const data = await this.runeEntryRepository.query(`
    select to2.address, to2.tx_hash as utxo_tx_hash, to2.vout as utxo_vout, to2.value as utxo_value, tre.* ,orb.*
    from transaction_outs to2 
    inner join outpoint_rune_balances orb on orb.tx_hash = to2.tx_hash and orb.vout = to2.vout
    inner join transaction_rune_entries tre on tre.rune_id = orb.rune_id 
    where spent = false and to2.address is not null and to2.address = '${address}'
    order by balance_value desc`);
    return data.map((d: any) => ({
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
        deploy_transaction: d.tx_hash,
        divisibility: d.divisibility,
        end_block: d.number,
        rune: d.spaced_rune,
        symbol: d.symbol ? d.symbol : '¤',
        timestamp: d.timestamp,
      },
    }));
  }
}

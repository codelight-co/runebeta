import { Inject, Injectable } from '@nestjs/common';
import { RuneFilterDto } from './dto';
import { HttpService } from '@nestjs/axios';
import { Repository } from 'typeorm';
import { TransactionRuneEntry } from '../database/entities/rune-entry.entity';
import { Rune } from 'rune_lib';
import { EtchRuneDto } from './dto/etch-rune-filter.dto';
import { EtchRune } from '../database/entities';
import { User } from '../database/entities/user.entity';

@Injectable()
export class RunesService {
  constructor(
    private readonly httpService: HttpService,
    @Inject('RUNE_ENTRY_REPOSITORY')
    private runeEntryRepository: Repository<TransactionRuneEntry>,
    @Inject('ETCH_RUNE_REPOSITORY')
    private etchRuneEntryRepository: Repository<EtchRune>,
  ) {}

  async getRunes(runeFilterDto: RuneFilterDto): Promise<any> {
    const builder = this.runeEntryRepository
      .createQueryBuilder()
      .offset(runeFilterDto.offset)
      .limit(runeFilterDto.limit);

    if (runeFilterDto.type) {
      builder.where('type = :type', { type: runeFilterDto.type });
    }

    if (runeFilterDto.sortBy) {
      builder.orderBy(
        runeFilterDto.sortBy,
        runeFilterDto.sortOrder?.toLocaleUpperCase() === 'DESC'
          ? 'DESC'
          : 'ASC',
      );
    }

    return {
      total: await builder.getCount(),
      limit: runeFilterDto.limit,
      offset: runeFilterDto.offset,
      runes: await builder.getMany(),
    };
  }

  async getRuneById(id: string): Promise<TransactionRuneEntry> {
    const rune = await this.runeEntryRepository
      .createQueryBuilder()
      .where('rune_id = :id', { id })
      .getOne();
    const _rune = new Rune(BigInt('5115427209785002519722332359899692'));
    console.log('_rune :>> ', _rune.id);
    console.log('rune.c :>> ', _rune.toString());

    return rune;
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

    return data;
  }

  async etchRune(user: User, etchRuneDto: EtchRuneDto): Promise<any> {
    const rune = await this.etchRuneEntryRepository.save({
      name: etchRuneDto.runeName || '',
      commit_block_height: etchRuneDto.commitBlockHeight,
      mint_block_height: etchRuneDto.commitBlockHeight + 6,
      mint_tx_hex: etchRuneDto.revealTxRawHex,
      user_id: user.id,
    });

    return rune;
  }

  async processEtching(): Promise<void> {
    const etchRunes = await this.etchRuneEntryRepository.find();
    console.log('etchRunes :>> ', etchRunes);
    return;
  }
}

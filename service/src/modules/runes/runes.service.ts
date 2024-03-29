import { Inject, Injectable } from '@nestjs/common';
import { RuneFilterDto } from './dto';
import { HttpService } from '@nestjs/axios';
import { Repository } from 'typeorm';
import { TransactionRuneEntry } from '../database/entities/rune-entry.entity';
import { Rune } from 'rune_lib';

@Injectable()
export class RunesService {
  constructor(
    private readonly httpService: HttpService,
    @Inject('RUNE_ENTRY_REPOSITORY')
    private runeEntryRepository: Repository<TransactionRuneEntry>,
  ) {}

  async getRunes(
    runeFilterDto: RuneFilterDto,
  ): Promise<TransactionRuneEntry[]> {
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

    return builder.getMany();
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
}

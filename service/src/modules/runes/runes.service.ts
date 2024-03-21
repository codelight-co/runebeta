import { Inject, Injectable } from '@nestjs/common';
import { RuneFilterDto } from './dto';
import { HttpService } from '@nestjs/axios';
import { Repository } from 'typeorm';
import { RuneEntry } from '../database/entities/rune-entry.entity';
import { Rune } from '../database/entities';

@Injectable()
export class RunesService {
  constructor(
    private readonly httpService: HttpService,
    @Inject('RUNE_ENTRY_REPOSITORY')
    private runeEntryRepository: Repository<RuneEntry>,
    @Inject('RUNE_REPOSITORY')
    private runeRepository: Repository<Rune>,
  ) {}

  async getRunes(runeFilterDto: RuneFilterDto): Promise<RuneEntry[]> {
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

  async getRuneById(id: string) {
    const res = await this.httpService
      .get(`https://api2.runealpha.xyz/rune/${id}`)
      .toPromise();

    return res.data?.data;
  }
}

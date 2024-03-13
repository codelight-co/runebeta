import { Injectable } from '@nestjs/common';
import { RuneFilterDto } from './dto';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class RunesService {
  constructor(private readonly httpService: HttpService) {}

  async getRunes(runeFilterDto: RuneFilterDto) {
    const res = await this.httpService
      .get('https://api2.runealpha.xyz/rune', {
        params: runeFilterDto,
      })
      .toPromise();

    return res.data;
  }

  async getRuneById(id: string) {
    const res = await this.httpService
      .get(`https://api2.runealpha.xyz/rune/${id}`)
      .toPromise();

    return res.data;
  }
}

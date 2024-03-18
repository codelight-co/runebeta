import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { MarketRuneFilterDto, MarketRuneOrderFilterDto } from './dto';

@Injectable()
export class MarketsService {
  constructor(private readonly httpService: HttpService) {}

  async getRunes(marketRuneFilterDto: MarketRuneFilterDto) {
    const res = await this.httpService
      .get('https://api.runealpha.xyz/market/runes', {
        params: marketRuneFilterDto,
      })
      .toPromise();

    return res.data;
  }

  async getRunesById(
    id: string,
    marketRuneOrderFilterDto: MarketRuneOrderFilterDto,
  ) {
    const res = await this.httpService
      .get(`https://api.runealpha.xyz/market/orders/rune/${id}`, {
        params: marketRuneOrderFilterDto,
      })
      .toPromise();

    return res.data;
  }

  async getStats() {
    const res = await this.httpService
      .get('https://api.runealpha.xyz/market/stats')
      .toPromise();

    return res.data;
  }
}

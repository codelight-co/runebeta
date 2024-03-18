import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { MarketsService } from './markets.service';
import { MarketRuneFilterDto, MarketRuneOrderFilterDto } from './dto';
import { CoreTransformInterceptor } from 'src/common/interceptors/coreTransform.interceptor';

@Controller('markets')
@UseInterceptors(CoreTransformInterceptor)
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

  // Get list runes on market
  @Get('runes')
  async getRunes(@Query() marketRuneFilterDto: MarketRuneFilterDto) {
    return this.marketsService.getRunes(marketRuneFilterDto);
  }

  // Get list rune order by id
  @Get('orders/rune/:id')
  async getRunesById(
    @Param('id') id: string,
    @Query() marketRuneOrderFilterDto: MarketRuneOrderFilterDto,
  ) {
    return this.marketsService.getRunesById(id, marketRuneOrderFilterDto);
  }

  // Get market stats
  @Get('stats')
  async getStats() {
    return this.marketsService.getStats();
  }
}

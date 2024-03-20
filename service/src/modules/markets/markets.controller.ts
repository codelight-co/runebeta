import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { MarketsService } from './markets.service';
import {
  CreateOrderDto,
  MarketRuneFilterDto,
  MarketRuneOrderFilterDto,
} from './dto';
import { CoreTransformInterceptor } from 'src/common/interceptors/coreTransform.interceptor';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { UserDecorator } from 'src/common/decorators/user.decorator';
import { User } from '../database/entities/user.entity';

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

  // Create sell order
  @Post('orders/sell')
  @UseGuards(AuthGuard)
  async createSellOrder(
    @Body() body: CreateOrderDto,
    @UserDecorator() user: User,
  ) {
    return this.marketsService.createSellOrder(body, user);
  }
}

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
import {
  IRuneListingState,
  ISelectPaymentUtxo,
} from 'src/common/interfaces/rune.interface';

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
    @Body() body: IRuneListingState,
    @UserDecorator() user: User,
  ) {
    return this.marketsService.createSellOrder(body, user);
  }

  // Generate unsigned listing PSBT
  @Post('orders/sell/unsigned-psbt')
  @UseGuards(AuthGuard)
  async generateUnsignedListingPSBT(
    @Body() body: IRuneListingState,
    @UserDecorator() user: User,
  ): Promise<IRuneListingState> {
    return this.marketsService.generateUnsignedListingPSBT(body, user);
  }

  // Select payment UTXOs for buying
  @Post('orders/buy/select-payment-utxos')
  @UseGuards(AuthGuard)
  async selectPaymentUTXOs(
    @Body() body: ISelectPaymentUtxo,
    @UserDecorator() user: User,
  ): Promise<any> {
    return this.marketsService.selectPaymentUTXOs(body, user);
  }
}

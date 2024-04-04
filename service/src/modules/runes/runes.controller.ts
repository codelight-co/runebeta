import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { RunesService } from './runes.service';
import { RuneFilterDto } from './dto';
import { CoreTransformInterceptor } from 'src/common/interceptors/coreTransform.interceptor';
import { EtchRuneDto } from './dto/etch-rune-filter.dto';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { UserDecorator } from 'src/common/decorators/user.decorator';
import { User } from '../database/entities/user.entity';
import { TransactionFilterDto } from '../transactions/dto';

@Controller('runes')
@UseInterceptors(CoreTransformInterceptor)
export class RunesController {
  constructor(private readonly runesService: RunesService) {}

  // Get list of runes
  @Get()
  async getRunes(@Query() runeFilterDto: RuneFilterDto) {
    return this.runesService.getRunes(runeFilterDto);
  }

  // Get rune by id
  @Get(':id/info')
  async getRuneById(@Param('id') id: string) {
    return this.runesService.getRuneById(id);
  }

  // Get top holders of a rune
  @Get(':id/top')
  async getTopHolders(@Param('id') id: string) {
    return this.runesService.getTopHolders(id);
  }

  // Etching rune
  @Post('etch')
  @UseGuards(AuthGuard)
  async etchRune(
    @Body() body: EtchRuneDto,
    @UserDecorator() user: User,
  ): Promise<any> {
    return this.runesService.etchRune(user, body);
  }

  // Get rune transactions
  @Get(':id/transactions')
  async getRuneTransactions(
    @Param('id') id: string,
    @Query() transactionFilterDto: TransactionFilterDto,
  ): Promise<any> {
    return this.runesService.getRuneTransactions(id, transactionFilterDto);
  }
}

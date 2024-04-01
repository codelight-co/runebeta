import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { RunesService } from './runes.service';
import { RuneFilterDto } from './dto';
import { CoreTransformInterceptor } from 'src/common/interceptors/coreTransform.interceptor';

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
  @Get(':id')
  async getRuneById(@Param('id') id: string) {
    return this.runesService.getRuneById(id);
  }

  // Get top holders of a rune
  @Get(':id/top')
  async getTopHolders(@Param('id') id: string) {
    return this.runesService.getTopHolders(id);
  }
}

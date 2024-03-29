import { Controller, Get, Param, Query } from '@nestjs/common';
import { RunesService } from './runes.service';
import { RuneFilterDto } from './dto';

@Controller('runes')
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
}

import { Controller, Get } from '@nestjs/common';
import { RunesService } from './runes.service';

@Controller('runes')
export class RunesController {
  constructor(private readonly runesService: RunesService) {}

  // Get list of runes
  @Get()
  async getRunes() {
    return this.runesService.getRunes();
  }

  // Get rune by id
  @Get(':id')
  async getRuneById() {
    return this.runesService.getRuneById();
  }
}

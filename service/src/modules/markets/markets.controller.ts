import { Controller, Get } from '@nestjs/common';
import { MarketsService } from './markets.service';

@Controller('markets')
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

  // Get runes order by id
  @Get('runes/:id')
  async getRunesById() {
    return this.marketsService.getRunesById();
  }
}

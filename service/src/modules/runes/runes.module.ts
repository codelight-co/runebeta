import { Module } from '@nestjs/common';
import { RunesController } from './runes.controller';
import { RunesService } from './runes.service';

@Module({
  controllers: [RunesController],
  providers: [RunesService]
})
export class RunesModule {}

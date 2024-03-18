import { Module } from '@nestjs/common';
import { RunesController } from './runes.controller';
import { RunesService } from './runes.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [RunesController],
  providers: [RunesService],
})
export class RunesModule {}

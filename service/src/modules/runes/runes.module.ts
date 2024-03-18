import { Module } from '@nestjs/common';
import { RunesController } from './runes.controller';
import { RunesService } from './runes.service';
import { HttpModule } from '@nestjs/axios';
import { runesProviders } from './runes.providers';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [HttpModule, DatabaseModule],
  controllers: [RunesController],
  providers: [...runesProviders, RunesService],
})
export class RunesModule {}

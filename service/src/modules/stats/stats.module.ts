import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { HttpModule } from '@nestjs/axios';
import { statsProviders } from './stats.providers';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [HttpModule, DatabaseModule],
  providers: [StatsService, ...statsProviders],
  controllers: [StatsController],
})
export class StatsModule {}

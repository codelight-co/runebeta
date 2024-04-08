import { Module } from '@nestjs/common';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { HttpModule } from '@nestjs/axios';
import { statsProviders } from './stats.providers';
import { DatabaseModule } from '../database/database.module';
import { BullModule } from '@nestjs/bull';
import { PROCESSOR } from 'src/common/enums';
import { IndexersModule } from '../indexers/indexers.module';

@Module({
  imports: [
    HttpModule,
    DatabaseModule,
    BullModule.registerQueue({
      name: PROCESSOR.STAT_QUEUE,
    }),
    IndexersModule,
  ],
  providers: [StatsService, ...statsProviders],
  controllers: [StatsController],
  exports: [StatsService],
})
export class StatsModule {}

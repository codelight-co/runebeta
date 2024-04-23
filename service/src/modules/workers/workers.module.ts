import { Module } from '@nestjs/common';
import { WorkersService } from './workers.service';
import { DatabaseModule } from '../database/database.module';
import { BullModule } from '@nestjs/bull';
import { PROCESSOR } from 'src/common/enums';
import { WorkersProcessor } from './workers.processor';
import { StatsModule } from '../stats/stats.module';

@Module({
  imports: [
    DatabaseModule,
    BullModule.registerQueue({ name: PROCESSOR.STAT_QUEUE }),
    StatsModule,
  ],
  providers: [WorkersService, WorkersProcessor],
})
export class WorkersModule {}

import { Module } from '@nestjs/common';
import { RunesController } from './runes.controller';
import { RunesService } from './runes.service';
import { runesProviders } from './runes.providers';
import { DatabaseModule } from '../database/database.module';
import { StatsModule } from '../stats/stats.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [DatabaseModule, StatsModule, TransactionsModule],
  controllers: [RunesController],
  providers: [...runesProviders, RunesService],
  exports: [RunesService],
})
export class RunesModule {}

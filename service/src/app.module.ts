import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StatsModule } from './modules/stats/stats.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { RunesModule } from './modules/runes/runes.module';
import { TransfersModule } from './modules/transfers/transfers.module';
import { MarketsModule } from './modules/markets/markets.module';
import { DatabaseModule } from './modules/database/database.module';

@Module({
  imports: [
    DatabaseModule,
    StatsModule,
    TransactionsModule,
    RunesModule,
    TransfersModule,
    MarketsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

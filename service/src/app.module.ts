import { CacheInterceptor, CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import * as redisStore from 'cache-manager-redis-store';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CACHE_TTL, REDIS_HOST, REDIS_PORT } from './environments';
import { DatabaseModule } from './modules/database/database.module';
import { MarketsModule } from './modules/markets/markets.module';
import { RunesModule } from './modules/runes/runes.module';
import { StatsModule } from './modules/stats/stats.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { TransfersModule } from './modules/transfers/transfers.module';

@Module({
  imports: [
    DatabaseModule,
    CacheModule.register({
      ttl: CACHE_TTL,
      isGlobal: true,
      store: redisStore,
      host: REDIS_HOST,
      port: REDIS_PORT,
    }),
    StatsModule,
    TransactionsModule,
    RunesModule,
    TransfersModule,
    MarketsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
})
export class AppModule {}

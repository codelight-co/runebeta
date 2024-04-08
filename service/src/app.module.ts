import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import * as redisStore from 'cache-manager-redis-store';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CACHE_TTL, JWT_SECRET, REDIS_HOST, REDIS_PORT } from './environments';
import { DatabaseModule } from './modules/database/database.module';
import { MarketsModule } from './modules/markets/markets.module';
import { RunesModule } from './modules/runes/runes.module';
import { StatsModule } from './modules/stats/stats.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { TransfersModule } from './modules/transfers/transfers.module';
import { AllExceptionsFilter } from './common/filters/exception.filter';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AuthModule } from './modules/auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { TaskModule } from './modules/task-schedule/task.module';
import { BullModule } from '@nestjs/bull';
import { WorkersModule } from './modules/workers/workers.module';

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
    RedisModule.forRoot({
      type: 'single',
      url: `redis://${REDIS_HOST}:${REDIS_PORT}`,
      options: {},
    }),
    BullModule.forRoot({
      redis: {
        host: REDIS_HOST,
        port: REDIS_PORT,
      },
    }),
    JwtModule.register({
      global: true,
      secret: JWT_SECRET,
      signOptions: { expiresIn: '7D' },
    }),
    TaskModule,
    StatsModule,
    TransactionsModule,
    RunesModule,
    TransfersModule,
    MarketsModule,
    AuthModule,
    WorkersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: CacheInterceptor,
    // },
  ],
})
export class AppModule {}

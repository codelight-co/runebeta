import { Module } from '@nestjs/common';
import { MarketsController } from './markets.controller';
import { MarketsService } from './markets.service';
import { HttpModule } from '@nestjs/axios';
import { ordersProviders } from './markets.providers';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [HttpModule, DatabaseModule, UsersModule, TransactionsModule],
  controllers: [MarketsController],
  providers: [MarketsService, ...ordersProviders],
  exports: [MarketsService],
})
export class MarketsModule {}

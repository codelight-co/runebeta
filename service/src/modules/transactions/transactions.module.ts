import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';
import { transactionsProviders } from './transactions.providers';

@Module({
  imports: [HttpModule, DatabaseModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, ...transactionsProviders],
  exports: [TransactionsService],
})
export class TransactionsModule {}

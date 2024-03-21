import { Module } from '@nestjs/common';
import { MarketsController } from './markets.controller';
import { MarketsService } from './markets.service';
import { HttpModule } from '@nestjs/axios';
import { ordersProviders } from './markets.providers';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [HttpModule, DatabaseModule],
  controllers: [MarketsController],
  providers: [MarketsService, ...ordersProviders],
})
export class MarketsModule {}

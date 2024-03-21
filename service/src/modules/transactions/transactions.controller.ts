import {
  Body,
  Controller,
  Get,
  Param,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { BroadcastTransactionDto, TransactionFilterDto } from './dto';
import { CoreTransformInterceptor } from 'src/common/interceptors/coreTransform.interceptor';

@Controller('transactions')
@UseInterceptors(CoreTransformInterceptor)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  // Get list transaction
  @Get()
  async getTransactions(@Query() transactionFilterDto: TransactionFilterDto) {
    return this.transactionsService.getTransactions(transactionFilterDto);
  }

  // Get transaction by id
  @Get(':id')
  async getTransactionById(@Param('id') id: string) {
    return this.transactionsService.getTransactionById(id);
  }

  // Broadcast transaction
  @Get('broadcast')
  async broadcastTransaction(@Body() txDto: BroadcastTransactionDto) {
    return this.transactionsService.broadcastTransaction(txDto);
  }
}

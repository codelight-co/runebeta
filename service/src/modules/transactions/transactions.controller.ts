import { Controller, Get, Param, Query } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionFilterDto } from './dto';

@Controller('transactions')
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
}

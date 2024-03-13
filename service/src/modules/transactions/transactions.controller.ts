import { Controller, Get } from '@nestjs/common';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  // Get list transactions with pagination and filter ?offset=0&limit=10&text=&ignoreInvalid=true
  @Get()
  async getTransactions() {
    return this.transactionsService.getTransactions();
  }

  // Get transaction by id
  @Get(':id')
  async getTransactionById() {
    return this.transactionsService.getTransactionById();
  }
}

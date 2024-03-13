import { Injectable } from '@nestjs/common';

@Injectable()
export class TransactionsService {
  async getTransactions() {
    // Get list transactions with pagination and filter ?offset=0&limit=10&text=&ignoreInvalid=true
    return [];
  }

  async getTransactionById() {
    // Get transaction by id
    return {};
  }
}

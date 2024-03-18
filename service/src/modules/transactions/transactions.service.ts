import { Injectable } from '@nestjs/common';
import { TransactionFilterDto } from './dto';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class TransactionsService {
  constructor(private readonly httpService: HttpService) {}

  async getTransactions(transactionFilterDto: TransactionFilterDto) {
    const res = await this.httpService
      .get('https://api2.runealpha.xyz/transaction', {
        params: transactionFilterDto,
      })
      .toPromise();

    return res.data;
  }

  async getTransactionById(id: string) {
    const res = await this.httpService
      .get(`https://api2.runealpha.xyz/transaction/${id}`)
      .toPromise();

    return res.data;
  }
}

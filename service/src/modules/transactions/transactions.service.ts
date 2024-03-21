import { Inject, Injectable } from '@nestjs/common';
import { TransactionFilterDto } from './dto';
import { HttpService } from '@nestjs/axios';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Transaction } from '../database/entities/transaction.entity';
import { TransactionIns } from '../database/entities/transaction-ins.entity';
import { TransactionOut } from '../database/entities/transaction-out.entity';
import { TxidRune } from '../database/entities/txid-rune.entity';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly httpService: HttpService,
    @Inject('TRANSACTION_REPOSITORY')
    private transactionRepository: Repository<Transaction>,
    @Inject('TRANSACTION_IN_REPOSITORY')
    private transactionInRepository: Repository<TransactionIns>,
    @Inject('TRANSACTION_OUT_REPOSITORY')
    private transactionOutRepository: Repository<TransactionOut>,
    @Inject('TXID_RUNE_REPOSITORY')
    private txidRuneRepository: Repository<TxidRune>,
  ) {}

  async getTransactions(
    transactionFilterDto: TransactionFilterDto,
  ): Promise<Transaction[]> {
    const builder = this.transactionRepository
      .createQueryBuilder()
      .leftJoinAndSelect('Transaction.vin', 'TransactionIns')
      .leftJoinAndSelect('Transaction.vout', 'TransactionOut');

    this.addTransactionFilter(builder, transactionFilterDto);

    return builder.getMany();
  }

  async getTransactionById(tx_hash: string): Promise<Transaction> {
    return this.transactionRepository
      .createQueryBuilder()
      .leftJoinAndSelect('Transaction.vin', 'TransactionIns')
      .leftJoinAndSelect('Transaction.vout', 'TransactionOut')
      .where('tx_hash = :tx_hash', { tx_hash })
      .getOne();
  }

  private async addTransactionFilter(
    builder: SelectQueryBuilder<Transaction>,
    filter: TransactionFilterDto,
  ) {
    if (filter.offset) {
      builder.offset(filter.offset);
    }

    if (filter.limit) {
      builder.limit(filter.limit);
    }

    if (filter.runeId) {
      builder.innerJoin(
        'TxidRune',
        'txid_rune',
        'txid_rune.tx_hash = Transaction.tx_hash',
      );
      builder.where('txid_rune.runeid = :runeid', { runeid: filter.runeId });
    }

    if (filter.sortBy) {
      builder.orderBy(
        filter.sortBy,
        filter.sortOrder?.toLocaleUpperCase() === 'DESC' ? 'DESC' : 'ASC',
      );
    }
  }

  async broadcastTransaction(rawTx: string) {
    const response = await this.httpService
      .post('https://api.blockcypher.com/v1/btc/main/txs/push', {
        tx: rawTx,
      })
      .toPromise();

    return response.data;
  }
}

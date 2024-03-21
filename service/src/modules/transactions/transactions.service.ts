import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { BroadcastTransactionDto, TransactionFilterDto } from './dto';
import { HttpService } from '@nestjs/axios';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Transaction } from '../database/entities/transaction.entity';
import { TransactionIns } from '../database/entities/transaction-ins.entity';
import { TransactionOut } from '../database/entities/transaction-out.entity';
import { TxidRune } from '../database/entities/txid-rune.entity';
import {
  BITCOIN_RPC_HOST,
  BITCOIN_RPC_PASS,
  BITCOIN_RPC_PORT,
  BITCOIN_RPC_USER,
} from 'src/environments';

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
  private logger = new Logger(TransactionsService.name);

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

  async broadcastTransaction(txDto: BroadcastTransactionDto) {
    try {
      const response = await this.httpService
        .post(
          `${BITCOIN_RPC_HOST}:${BITCOIN_RPC_PORT}`,
          {
            jsonrpc: '1.0',
            id: 'codelight',
            method: 'sendrawtransaction',
            params: [txDto.rawTransaction],
          },
          {
            auth: {
              username: BITCOIN_RPC_USER,
              password: BITCOIN_RPC_PASS,
            },
          },
        )
        .toPromise();
      return response.data;
    } catch (error) {
      if (error.response) {
        // throw status 400 with error message
        return error.response.data;
      }

      this.logger.error('Error broadcasting transaction', error);

      throw new BadRequestException('Error broadcasting transaction');
    }
  }
}

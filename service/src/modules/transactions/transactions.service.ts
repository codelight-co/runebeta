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
import {
  BITCOIN_RPC_HOST,
  BITCOIN_RPC_PASS,
  BITCOIN_RPC_PORT,
  BITCOIN_RPC_USER,
} from 'src/environments';
import { OutpointRuneBalance } from '../database/entities/sequence-number-runeid.entity';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly httpService: HttpService,
    @Inject('TRANSACTION_REPOSITORY')
    private transactionRepository: Repository<Transaction>,
  ) {}
  private logger = new Logger(TransactionsService.name);

  async getTransactions(
    transactionFilterDto: TransactionFilterDto,
  ): Promise<any> {
    const builder = this.transactionRepository.createQueryBuilder();

    builder
      .leftJoinAndSelect('Transaction.vin', 'TransactionIns')
      .leftJoinAndSelect('Transaction.vout', 'TransactionOut')
      .innerJoinAndMapOne(
        'Transaction.block',
        'Transaction.block',
        'Block',
        'Block.block_height = Transaction.block_height',
      );

    if (transactionFilterDto.runeId) {
      builder.innerJoinAndMapOne(
        'Transaction.outpointRuneBalances',
        OutpointRuneBalance,
        'outpoint',
        'outpoint.tx_hash = TransactionOut.tx_hash',
      );
    }

    if (transactionFilterDto.address) {
      builder.where('TransactionOut.address = :address', {
        address: transactionFilterDto.address,
      });
    }

    const total = await builder.getCount();

    this.addTransactionFilter(builder, transactionFilterDto);

    return {
      total,
      limit: transactionFilterDto.limit,
      offset: transactionFilterDto.offset,
      transactions: await builder.getMany(),
    };
  }

  async getTransactionById(tx_hash: string): Promise<Transaction> {
    return this.transactionRepository
      .createQueryBuilder()
      .leftJoinAndSelect('Transaction.vin', 'TransactionIns')
      .leftJoinAndSelect('Transaction.vout', 'TransactionOut')
      .innerJoinAndMapOne(
        'Transaction.block',
        'Transaction.block',
        'Block',
        'Block.block_height = Transaction.block_height',
      )
      .where('tx_hash = :tx_hash', { tx_hash })
      .getOne();
  }

  private async addTransactionFilter(
    builder: SelectQueryBuilder<Transaction>,
    filter: TransactionFilterDto,
  ) {
    if (filter.offset) {
      builder.skip(filter.offset);
    }

    if (filter.limit) {
      builder.take(filter.limit);
    }

    if (filter.sortBy) {
      builder.orderBy(
        filter.sortBy,
        filter.sortOrder?.toLocaleUpperCase() === 'DESC' ? 'DESC' : 'ASC',
      );
    } else {
      builder.orderBy('Transaction.block_height', 'DESC');
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

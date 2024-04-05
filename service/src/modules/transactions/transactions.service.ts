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
import { TransactionOut } from '../database/entities/transaction-out.entity';
import { OutpointRuneBalance } from '../database/entities/outpoint-rune-balance.entity';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly httpService: HttpService,
    @Inject('TRANSACTION_REPOSITORY')
    private transactionRepository: Repository<Transaction>,
    @Inject('TRANSACTION_OUT_REPOSITORY')
    private transactionOutRepository: Repository<TransactionOut>,
  ) {}
  private logger = new Logger(TransactionsService.name);

  async getTransactions(
    transactionFilterDto: TransactionFilterDto,
  ): Promise<any> {
    const builder = this.transactionRepository.createQueryBuilder();
    let total = 0;

    if (!transactionFilterDto.runeId && !transactionFilterDto.address) {
      total = await builder.getCount();
    }

    builder
      .leftJoinAndSelect('Transaction.vin', 'TransactionIns')
      .leftJoinAndSelect('Transaction.vout', 'TransactionOut')
      .leftJoinAndSelect('TransactionOut.outpointRuneBalances', 'Outpoint')
      .leftJoinAndSelect('Outpoint.rune', 'rune')
      .innerJoinAndMapOne(
        'Transaction.block',
        'Transaction.block',
        'Block',
        'Block.block_height = Transaction.block_height',
      );

    if (transactionFilterDto.runeId) {
      builder
        .innerJoinAndMapOne(
          'Transaction.outpointRuneBalances',
          OutpointRuneBalance,
          'outpoint',
          'outpoint.tx_hash = TransactionOut.tx_hash',
        )
        .where('outpoint.rune_id = :runeid', {
          runeid: transactionFilterDto.runeId,
        });
    }

    if (transactionFilterDto.address) {
      builder.where('TransactionOut.address = :address', {
        address: transactionFilterDto.address,
      });
    }

    if (transactionFilterDto.runeId || transactionFilterDto.address) {
      total = await builder.getCount();
    }

    this.addTransactionFilter(builder, transactionFilterDto);

    const transactions = await builder.getMany();
    if (transactions?.length) {
      for (let index = 0; index < transactions.length; index++) {
        const transaction = transactions[index];
        if (transaction?.vout.length > 0) {
          for (let index = 0; index < transaction.vout.length; index++) {
            const vout = transaction.vout[index];
            transaction.vout[index] = {
              ...vout,
              address: vout?.address,
              value: vout?.value || 0,
              runeInject: vout?.outpointRuneBalances?.length
                ? vout.outpointRuneBalances.map((outpoint) => ({
                    address: vout.address,
                    rune_id: outpoint.rune_id,
                    deploy_transaction: outpoint.rune.tx_hash,
                    timestamp: outpoint.rune.timestamp,
                    rune: outpoint.rune.spaced_rune,
                    divisibility: outpoint.rune.divisibility,
                    symbol: outpoint.rune.symbol,
                    utxo_type: 'transfer',
                    amount: outpoint.balance_value,
                    is_etch: false,
                    is_claim: false,
                  }))
                : null,
            } as any;
          }
        }
      }
    }

    return {
      total,
      limit: transactionFilterDto.limit,
      offset: transactionFilterDto.offset,
      transactions,
    };
  }

  async getTransactionById(tx_hash: string): Promise<any> {
    const transaction = await this.transactionRepository
      .createQueryBuilder()
      .leftJoinAndSelect('Transaction.vin', 'TransactionIns')
      .leftJoinAndSelect('Transaction.vout', 'TransactionOut')
      .leftJoinAndSelect('TransactionOut.outpointRuneBalances', 'Outpoint')
      .leftJoinAndSelect('Outpoint.rune', 'rune')
      .innerJoinAndMapOne(
        'Transaction.block',
        'Transaction.block',
        'Block',
        'Block.block_height = Transaction.block_height',
      )
      .where('Transaction.tx_hash = :tx_hash', { tx_hash })
      .getOne();

    if (transaction?.vout.length > 0) {
      for (let index = 0; index < transaction.vout.length; index++) {
        const vout = transaction.vout[index];
        transaction.vout[index] = {
          ...vout,
          address: vout?.address,
          value: vout?.value,
          runeInject: vout?.outpointRuneBalances?.length
            ? vout.outpointRuneBalances.map((outpoint) => ({
                address: vout.address,
                rune_id: outpoint.rune_id,
                deploy_transaction: outpoint.rune.tx_hash,
                timestamp: outpoint.rune.timestamp,
                rune: outpoint.rune.spaced_rune,
                divisibility: outpoint.rune.divisibility,
                symbol: outpoint.rune.symbol,
                utxo_type: 'transfer',
                amount: outpoint.balance_value,
                is_etch: false,
                is_claim: false,
              }))
            : null,
        } as any;
      }
    }
    if (transaction?.vin.length > 0) {
      for (let index = 0; index < transaction.vin.length; index++) {
        const vin = transaction.vin[index];

        const vout = await this.transactionOutRepository
          .createQueryBuilder('out')
          .leftJoinAndSelect('out.outpointRuneBalances', 'outpoint')
          .leftJoinAndSelect('outpoint.rune', 'rune')
          .where('out.tx_hash = :tx_hash', {
            tx_hash: vin.previous_output_hash,
          })
          .andWhere('out.vout = :vout', {
            vout: vin.previous_output_vout,
          })
          .getOne();

        transaction.vin[index] = {
          ...vin,
          address: vout?.address,
          value: vout?.value,
          runeInject: vout?.outpointRuneBalances?.length
            ? vout.outpointRuneBalances.map((outpoint) => ({
                rune_id: outpoint.rune_id,
                deploy_transaction: outpoint.rune.tx_hash,
                timestamp: outpoint.rune.timestamp,
                rune: outpoint.rune.spaced_rune,
                divisibility: outpoint.rune.divisibility,
                symbol: outpoint.rune.symbol,
                utxo_type: 'claim',
                amount: outpoint.balance_value,
                is_etch: false,
                is_claim: false,
              }))
            : null,
        } as any;
      }
    }

    return {
      ...transaction,
      timestamp: transaction.block.block_time,
      fee: 0,
      vsize: 0,
      txid: transaction.tx_hash,
    };
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

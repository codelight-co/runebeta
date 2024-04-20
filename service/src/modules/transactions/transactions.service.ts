import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  BroadcastTransactionDto,
  RetrieveRuneDto,
  TransactionFilterDto,
} from './dto';
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
import { TransactionRuneEntry } from '../database/entities/rune-entry.entity';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { IndexersService } from '../indexers/indexers.service';
import { TxidRune } from '../database/entities/txid-rune.entity';
import { Block } from '../database/entities/block.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheService: Cache,
    private readonly httpService: HttpService,
    @Inject('TRANSACTION_REPOSITORY')
    private transactionRepository: Repository<Transaction>,
    @Inject('TRANSACTION_OUT_REPOSITORY')
    private transactionOutRepository: Repository<TransactionOut>,
    @Inject('RUNE_ENTRY_REPOSITORY')
    private runeEntryRepository: Repository<TransactionRuneEntry>,
    @Inject('OUTPOINT_RUNE_BALANCE_REPOSITORY')
    private outpointRuneBalanceRepository: Repository<OutpointRuneBalance>,
    @Inject('TX_ID_RUNE_REPOSITORY')
    private txidRuneRepository: Repository<TxidRune>,
    private readonly indexersService: IndexersService,
  ) {}
  private logger = new Logger(TransactionsService.name);

  async getTransactions(
    transactionFilterDto: TransactionFilterDto,
  ): Promise<any> {
    // Check rune_id is hex or not
    if (transactionFilterDto.runeId) {
      const isHex = /^[0-9A-Fa-f]{6}$/.test(transactionFilterDto.runeId);
      if (!isHex) {
        transactionFilterDto.runeId = Buffer.from(
          transactionFilterDto.runeId,
          'hex',
        ).toString('utf-8');
      }
    }

    const blockHeight = await this.indexersService.getBlockHeight();
    const cachedData = await this.cacheService.get(
      `${blockHeight}:${Object.values(transactionFilterDto).join('-')}`,
    );
    if (cachedData) {
      return cachedData;
    }

    const builderTotal = this.txidRuneRepository.createQueryBuilder('txrune');
    let total = 0;
    if (transactionFilterDto.runeId || transactionFilterDto.address) {
      builderTotal.innerJoinAndMapOne(
        'txrune.outpointRuneBalances',
        OutpointRuneBalance,
        'outpoint',
        'outpoint.tx_hash = txrune.tx_hash',
      );
    }
    if (transactionFilterDto.runeId) {
      builderTotal
        .where('outpoint.rune_id = :runeid', {
          runeid: transactionFilterDto.runeId,
        })
        .groupBy('txrune.tx_hash');
    }
    if (transactionFilterDto.address) {
      builderTotal
        .andWhere('outpoint.address = :address', {
          address: transactionFilterDto.address,
        })
        .groupBy('txrune.tx_hash');
    }
    total = await builderTotal.getCount();

    const builder = this.txidRuneRepository
      .createQueryBuilder('txrune')
      .leftJoinAndMapOne(
        'txrune.block',
        Block,
        'block',
        `block.block_height = txrune.block_height`,
      )
      .leftJoinAndMapMany(
        'txrune.outpointRuneBalances',
        OutpointRuneBalance,
        'outpoint',
        'outpoint.tx_hash = txrune.tx_hash',
      )
      .leftJoinAndMapOne(
        'outpoint.rune',
        TransactionRuneEntry,
        'rune',
        'rune.rune_id = outpoint.rune_id',
      );

    if (transactionFilterDto.runeId) {
      builder.where('outpoint.rune_id = :runeid', {
        runeid: transactionFilterDto.runeId,
      });
    }
    if (transactionFilterDto.address) {
      builder.andWhere('outpoint.address = :address', {
        address: transactionFilterDto.address,
      });
    }
    this.addTransactionFilter(builder, transactionFilterDto);

    const transactions = await builder.getMany();
    if (transactions?.length) {
      for (let index = 0; index < transactions.length; index++) {
        const transaction = transactions[index] as any;
        if (transaction?.outpointRuneBalances.length > 0) {
          const vout = [
            {
              runeInject: transaction?.outpointRuneBalances?.length
                ? transaction.outpointRuneBalances.map((outpoint) => {
                    return {
                      rune_id: outpoint.rune_id,
                      deploy_transaction: outpoint?.rune?.tx_hash,
                      timestamp: outpoint?.rune?.timestamp,
                      rune: outpoint?.rune?.spaced_rune,
                      divisibility: outpoint?.rune?.divisibility,
                      symbol: outpoint?.rune?.symbol,
                      utxo_type: 'transfer',
                      amount: outpoint?.balance_value,
                      is_etch: false,
                      is_claim: false,
                    };
                  })
                : null,
            },
          ];
          transactions[index] = {
            tx_hash: transaction?.tx_hash,
            timestamp:
              transaction?.block?.block_time || new Date().getTime() / 1000,
            vout,
          } as any;
        }
      }
    }

    await this.cacheService.set(
      `${blockHeight}:${Object.values(transactionFilterDto).join('-')}`,
      {
        total,
        limit: transactionFilterDto.limit,
        offset: transactionFilterDto.offset,
        transactions,
      },
      900,
    );

    return {
      total,
      limit: transactionFilterDto.limit,
      offset: transactionFilterDto.offset,
      transactions,
    };
  }

  async getTransactionById(tx_hash: string): Promise<any> {
    const rawTransaction = await this.httpService
      .post(
        `${BITCOIN_RPC_HOST}:${BITCOIN_RPC_PORT}`,
        {
          jsonrpc: '1.0',
          id: 'curltest',
          method: 'getrawtransaction',
          params: [tx_hash, true],
        },
        {
          auth: {
            username: BITCOIN_RPC_USER,
            password: BITCOIN_RPC_PASS,
          },
        },
      )
      .toPromise();
    const voutValues = rawTransaction.data.result.vout.map(
      (vout) => vout.value,
    );
    const totalVoutValues = voutValues.reduce((acc, value) => acc + value, 0);
    const vinValues = await Promise.all(
      rawTransaction.data.result.vin.map(async (input) => {
        const response = await this.httpService
          .post(
            `${BITCOIN_RPC_HOST}:${BITCOIN_RPC_PORT}`,
            {
              jsonrpc: '1.0',
              id: 'curltest',
              method: 'getrawtransaction',
              params: [input.txid, true],
            },
            {
              auth: {
                username: BITCOIN_RPC_USER,
                password: BITCOIN_RPC_PASS,
              },
            },
          )
          .toPromise();
        return response.data.result.vout[input.vout].value;
      }),
    );
    const totalVinValues = vinValues.reduce((acc, value) => acc + value, 0);
    const fee = (totalVinValues - totalVoutValues).toFixed(8);
    const transaction = await this.transactionRepository
      .createQueryBuilder()
      .innerJoinAndSelect('Transaction.vin', 'TransactionIns')
      .innerJoinAndSelect('Transaction.vout', 'TransactionOut')
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
    if (!transaction) {
      const response = await this.httpService
        .post(
          `${BITCOIN_RPC_HOST}:${BITCOIN_RPC_PORT}`,
          {
            jsonrpc: '1.0',
            id: 'curltest',
            method: 'getrawtransaction',
            params: [tx_hash, true],
          },
          {
            auth: {
              username: BITCOIN_RPC_USER,
              password: BITCOIN_RPC_PASS,
            },
          },
        )
        .toPromise();

      if (!response.data?.result) {
        throw new BadRequestException('Transaction not found');
      }
      const vins = await Promise.all(
        response.data.result.vin.map(async (input) => {
          const response = await this.httpService
            .post(
              `${BITCOIN_RPC_HOST}:${BITCOIN_RPC_PORT}`,
              {
                jsonrpc: '1.0',
                id: 'curltest',
                method: 'getrawtransaction',
                params: [input.txid, true],
              },
              {
                auth: {
                  username: BITCOIN_RPC_USER,
                  password: BITCOIN_RPC_PASS,
                },
              },
            )
            .toPromise();
          if (!response.data?.result) {
            return input;
          }
          const outpoints = await this.outpointRuneBalanceRepository.find({
            where: { tx_hash: input.txid, vout: input.vout },
            relations: ['rune'],
          });

          return {
            ...input,
            runeInject: outpoints?.length
              ? outpoints.map((outpoint) => ({
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
            address: response.data.result.vout[input.vout].scriptPubKey.address,
            value: response.data.result.vout[input.vout].value,
          };
        }),
      );
      const vouts = await Promise.all(
        response.data.result.vout.map(async (output) => {
          const outpoints = await this.outpointRuneBalanceRepository.find({
            where: { tx_hash, vout: output.n },
            relations: ['rune'],
          });

          return {
            ...output,
            address: output.scriptPubKey.address,
            value: output.value,
            runeInject: outpoints?.length
              ? outpoints.map((outpoint) => ({
                  rune_id: outpoint.rune_id,
                  deploy_transaction: outpoint.rune.tx_hash,
                  timestamp: outpoint.rune.timestamp,
                  rune: outpoint.rune.spaced_rune,
                  divisibility: outpoint.rune.divisibility,
                  symbol: outpoint.rune.symbol,
                  amount: outpoint.balance_value,
                  is_etch: false,
                  is_claim: false,
                }))
              : null,
          };
        }),
      );

      const _response = { ...response.data.result, vin: vins, vout: vouts };

      return _response;
    }

    if (transaction?.vout.length > 0) {
      for (let index = 0; index < transaction.vout.length; index++) {
        const vout = transaction.vout[index];

        let rune_stone = null;
        if (vout.rune_stone) {
          try {
            rune_stone = JSON.parse(vout.rune_stone as any);
          } catch (error) {
            this.logger.error('Error parsing rune stone', error);
          }
        }
        const value = (vout?.value / 100000000).toFixed(8);
        transaction.vout[index] = {
          ...vout,
          rune_stone: rune_stone,
          address: vout?.address,
          value: vout?.value ? value.toString() : 0,
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

        const value = (vout?.value / 100000000).toFixed(8);
        transaction.vin[index] = {
          ...vin,
          address: vout?.address,
          value: vout?.value ? value.toString() : 0,
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
      timestamp: transaction?.block?.block_time,
      fee,
      vsize: rawTransaction.data.result.vsize,
      weight: rawTransaction.data.result.weight,
      txid: transaction.tx_hash,
    };
  }

  private async addTransactionFilter(
    builder: SelectQueryBuilder<TxidRune>,
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
      builder.orderBy('txrune.block_height', 'DESC');
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

  async retrieveRuneByTxIDs(txDto: RetrieveRuneDto): Promise<any> {
    const runeData = await Promise.all(
      txDto.tx_locations.map(async (location) => {
        const arrLocation = location.split(':');
        if (arrLocation.length != 2) {
          return null;
        }

        try {
          return this.outpointRuneBalanceRepository.find({
            where: { tx_hash: arrLocation[0], vout: parseInt(arrLocation[1]) },
            relations: ['rune'],
          });
        } catch (error) {
          this.logger.error('Error retrieving rune by tx id', error);
          return null;
        }
      }),
    );

    return runeData.map((rune) => (rune?.length ? rune : null));
  }
}

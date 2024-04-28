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
import {
  BITCOIN_RPC_HOST,
  BITCOIN_RPC_PASS,
  BITCOIN_RPC_PORT,
  BITCOIN_RPC_USER,
} from 'src/environments';
import { TransactionOut } from '../database/entities/indexer/transaction-out.entity';
import { OutpointRuneBalance } from '../database/entities/indexer/outpoint-rune-balance.entity';
import { TransactionRuneEntry } from '../database/entities/indexer/rune-entry.entity';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { IndexersService } from '../indexers/indexers.service';
import { TxidRune } from '../database/entities/indexer/txid-rune.entity';
import { Block } from '../database/entities/indexer/block.entity';
import { SpentTransactionOut } from '../database/entities/indexer/spent-transaction-out.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheService: Cache,
    private readonly httpService: HttpService,
    @Inject('TRANSACTION_OUT_REPOSITORY')
    private transactionOutRepository: Repository<TransactionOut>,
    @Inject('SPENT_TRANSACTION_OUT_REPOSITORY')
    private spentTransactionOutRepository: Repository<SpentTransactionOut>,
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
    const transaction = rawTransaction.data.result;

    const voutValues = transaction.vout.map((vout) => vout.value);
    const totalVoutValues = voutValues.reduce((acc, value) => acc + value, 0);
    const vinValues = await Promise.all(
      transaction.vin.map(async (input) => {
        try {
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
        } catch (error) {
          this.logger.error('Error getting vin value', error);

          return null;
        }
      }),
    );

    const totalVinValues = vinValues.reduce((acc, value) => acc + value, 0);
    const fee = (totalVinValues - totalVoutValues).toFixed(8);

    // Get vout rune data
    if (transaction?.vout.length > 0) {
      transaction.vout = await Promise.all(
        transaction.vout.map(async (vout) => {
          let isSpent = false;

          // Get rune stone on vout
          let transactionOut = await this.transactionOutRepository
            .createQueryBuilder('out')
            .leftJoinAndSelect('out.outpointRuneBalances', 'outpoint')
            .leftJoinAndSelect('outpoint.rune', 'rune')
            .where('out.tx_hash = :tx_hash', { tx_hash })
            .andWhere('out.vout = :vout', { vout: vout?.n })
            .getOne();
          if (!transactionOut) {
            isSpent = true;
            transactionOut = await this.spentTransactionOutRepository
              .createQueryBuilder('out')
              .leftJoinAndSelect('out.spentOutpointRuneBalances', 'outpoint')
              .leftJoinAndSelect('outpoint.rune', 'rune')
              .where('out.tx_hash = :tx_hash', { tx_hash })
              .andWhere('out.vout = :vout', { vout: vout?.n })
              .getOne();
          }

          let rune_stone = null;
          if (transactionOut.rune_stone) {
            try {
              rune_stone = JSON.parse(transactionOut.rune_stone as any);
            } catch (error) {
              this.logger.error('Error parsing rune stone', error);
            }
          }

          // Get rune inject
          const runeBalances = transactionOut?.outpointRuneBalances?.length
            ? transactionOut.outpointRuneBalances
            : transactionOut?.spentOutpointRuneBalances?.length
              ? transactionOut?.spentOutpointRuneBalances
              : [];
          const value = (transactionOut?.value / 100000000).toFixed(8);

          return {
            ...vout,
            rune_stone: rune_stone,
            address: transactionOut?.address,
            value: transactionOut?.value ? value.toString() : 0,
            isSpent,
            runeInject: runeBalances?.length
              ? runeBalances.map((outpoint) => ({
                  address: transactionOut.address,
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
        }),
      );
    }

    // Get vin rune data
    if (transaction?.vin.length > 0) {
      transaction.vin = await Promise.all(
        transaction.vin.map(async (vin) => {
          const vout = await this.spentTransactionOutRepository
            .createQueryBuilder('out')
            .leftJoinAndSelect('out.spentOutpointRuneBalances', 'outpoint')
            .leftJoinAndSelect('outpoint.rune', 'rune')
            .where('out.tx_hash = :tx_hash', {
              tx_hash: vin.txid,
            })
            .andWhere('out.vout = :vout', {
              vout: vin.vout,
            })
            .getOne();
          const value = (vout?.value / 100000000).toFixed(8);

          return {
            ...vin,
            address: vout?.address,
            value: vout?.value ? value.toString() : 0,
            runeInject: vout?.spentOutpointRuneBalances?.length
              ? vout.spentOutpointRuneBalances.map((outpoint) => ({
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
        }),
      );
    }

    return {
      ...transaction,
      timestamp: transaction?.blocktime,
      confirmations: transaction?.confirmations,
      fee,
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

  async broadcastTransaction(
    txDto: BroadcastTransactionDto,
    config: Array<any> = [],
  ) {
    try {
      const response = await this.httpService
        .post(
          `${BITCOIN_RPC_HOST}:${BITCOIN_RPC_PORT}`,
          {
            jsonrpc: '1.0',
            id: 'codelight',
            method: 'sendrawtransaction',
            params: [txDto.rawTransaction, ...config],
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
    const blockHeight = await this.indexersService.getBlockHeight();

    const runeData = await Promise.all(
      txDto.tx_locations.map(async (location) => {
        const arrLocation = location.split(':');
        if (arrLocation.length != 2) {
          return null;
        }

        const cachedData = await this.cacheService.get(
          `${blockHeight}:retrive-transaction:${location}`,
        );
        if (cachedData) {
          return cachedData as OutpointRuneBalance[];
        }

        try {
          const outpointRuneBalances =
            await this.outpointRuneBalanceRepository.find({
              where: {
                tx_hash: arrLocation[0],
                vout: parseInt(arrLocation[1]),
              },
              relations: ['rune'],
            });

          if (outpointRuneBalances?.length) {
            await Promise.all(
              outpointRuneBalances.map(async (outpoint, index) => {
                const runeInfo: any = await this.cacheService.get(
                  `rune-info:${outpoint.rune_id}`,
                );
                if (runeInfo) {
                  outpointRuneBalances[index].rune.parent =
                    runeInfo?.parent || null;
                  outpointRuneBalances[index].rune.mintable =
                    runeInfo?.mintable || false;
                }

                return;
              }),
            );
            // Get stat data
            await this.cacheService.set(
              `${blockHeight}:retrive-transaction:${location}`,
              outpointRuneBalances,
              900,
            );
          }

          return outpointRuneBalances;
        } catch (error) {
          this.logger.error('Error retrieving rune by tx id', error);
          return null;
        }
      }),
    );

    return runeData.map((rune) => {
      if (rune?.length) {
        return rune;
      }

      return null;
    });
  }
}

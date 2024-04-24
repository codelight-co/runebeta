import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { User } from '../database/entities/marketplace/user.entity';
import { Repository } from 'typeorm';
import mempoolJS from '@mempool/mempool.js';
import { BITCOIN_NETWORK } from 'src/environments';
import { MempoolReturn } from '@mempool/mempool.js/lib/interfaces/index';
import { AddressTxsUtxo } from '@mempool/mempool.js/lib/interfaces/bitcoin/addresses';
import { TransactionOut } from '../database/entities/indexer/transaction-out.entity';
import { TransactionsService } from '../transactions/transactions.service';
import { TransactionRuneEntry } from '../database/entities/indexer/rune-entry.entity';
import { Order } from '../database/entities/marketplace/order.entity';
import { MarketRuneOrderFilterDto } from '../markets/dto';
import { IndexersService } from '../indexers/indexers.service';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @Inject('USER_REPOSITORY')
    private userRepository: Repository<User>,
    @Inject('TRANSACTION_OUT_REPOSITORY')
    private transactionOutRepository: Repository<TransactionOut>,
    @Inject('RUNE_ENTRY_REPOSITORY')
    private runeEntryRepository: Repository<TransactionRuneEntry>,
    @Inject('ORDER_REPOSITORY')
    private orderRepository: Repository<Order>,
    private readonly transactionsService: TransactionsService,
    private readonly indexersService: IndexersService,
  ) {}

  private mempoolClient: MempoolReturn['bitcoin'];

  async onModuleInit() {
    this.mempoolClient = mempoolJS({
      network: BITCOIN_NETWORK,
    }).bitcoin;
  }

  async findOneById(id: number): Promise<User> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findOneByWalletAddress(walletAddress: string): Promise<User> {
    return this.userRepository.findOne({ where: { walletAddress } });
  }

  async create(walletAddress: string): Promise<User> {
    const user = new User();
    user.walletAddress = walletAddress;

    return this.userRepository.save(user);
  }

  async getMyUtxo(user: User): Promise<AddressTxsUtxo[]> {
    return this.mempoolClient.addresses.getAddressTxsUtxo({
      address: user.walletAddress,
    });
  }

  async getMyRunes(user: User): Promise<any> {
    const data = await this.transactionOutRepository.query(`
    select * 
    from transaction_rune_entries tre 
    inner join (
      select rune_id, sum(balance_value) as balance_value
      from outpoint_rune_balances orb 
      where orb.address = '${user.walletAddress}'
      group by rune_id
    ) as rb on rb.rune_id = tre.rune_id `);

    return data;
  }

  async getMyRuneById(user: User, id: string): Promise<TransactionOut> {
    const data = await this.transactionOutRepository.query(`
    select tre.spaced_rune ,orb.*
    from outpoint_rune_balances orb
    inner join transaction_rune_entries tre on tre.rune_id = orb.rune_id 
    where orb.address is not null and tre.rune_id = '${id}' and orb.address = '${user.walletAddress}'
    order by orb.balance_value desc`);

    return data;
  }

  async search(query: string): Promise<any> {
    // Is transaction hash
    if (query.length === 64) {
      const transaction =
        await this.transactionsService.getTransactionById(query);
      if (transaction) {
        return {
          type: 'transaction',
          query,
          data: [transaction],
        };
      }
    }

    // Is address
    if (query.length >= 34 && query.length <= 62) {
      try {
        const addressRunes = await this.getMyUtxo({
          walletAddress: query.trim(),
        } as User);
        if (addressRunes) {
          return {
            type: 'address',
            query,
            data: [addressRunes],
          };
        } else {
          return {
            type: 'address',
            query,
            data: [{ address: query }],
          };
        }
      } catch (error) {
        // Check is taproot address
        return {
          type: 'address',
          query,
          data: [{ address: query }],
        };
      }
    }

    // Is rune id
    const rune = await this.runeEntryRepository
      .createQueryBuilder()
      .where(`spaced_rune ILIKE '%${query.trim().split(' ').join('_')}%'`)
      .getMany();
    if (rune) {
      return {
        type: 'rune',
        query,
        data: rune,
      };
    }

    return null;
  }

  async getMyOrders(
    user: User,
    marketRuneOrderFilterDto: MarketRuneOrderFilterDto,
  ): Promise<any> {
    const builder = this.orderRepository
      .createQueryBuilder('order')
      .where('order.user_id = :userId', { userId: user.id });

    if (marketRuneOrderFilterDto.status) {
      builder.andWhere('order.status = :status', {
        status: marketRuneOrderFilterDto.status,
      });
    }
    if (marketRuneOrderFilterDto.sortBy) {
      builder.orderBy(
        `order.${marketRuneOrderFilterDto.sortBy}`,
        marketRuneOrderFilterDto.sortOrder?.toLocaleUpperCase() === 'DESC'
          ? 'DESC'
          : 'ASC',
      );
    } else {
      builder.orderBy('order.created_at', 'DESC');
    }

    const total = await builder.getCount();
    if (
      total &&
      (marketRuneOrderFilterDto.offset || marketRuneOrderFilterDto.limit)
    ) {
      builder
        .offset(marketRuneOrderFilterDto.offset)
        .limit(marketRuneOrderFilterDto.limit);
    }

    const orders = await builder.getMany();
    const runeIds = orders.map((order) => order.rune_id);
    const runeEntries = runeIds.length
      ? await this.runeEntryRepository
          .createQueryBuilder('rune')
          .where('rune.rune_id IN (:...runeIds)', { runeIds })
          .getMany()
      : [];
    const runeEntriesMap = {};
    for (let index = 0; index < runeEntries.length; index++) {
      const entry = runeEntries[index];
      runeEntriesMap[entry.rune_id] = entry;
    }

    return {
      total,
      limit: marketRuneOrderFilterDto.limit,
      offset: marketRuneOrderFilterDto.offset,
      runes: orders.map((order) => ({
        id: order.id,
        amount_rune: order?.runeItem.tokenValue,
        amount_rune_remain_seller: order?.runeItem.outputValue,
        amount_satoshi: Number(order?.runeItem.tokenValue) * order.price,
        buyer: null,
        buyer_id: null,
        confirmed: false,
        confirmed_at_block: 0,
        owner: {
          wallet_address: order.sellerRuneAddress,
        },
        owner_id: order.userId,
        price_per_unit: order.price,
        received_address: null,
        rune_hex: runeEntriesMap[order.rune_id]?.rune_hex || '',
        rune_id: order?.runeItem.id,
        rune_name: runeEntriesMap[order.rune_id].spaced_rune,
        rune_utxo: [
          {
            id: order?.runeItem.id,
            address: order.sellerRuneAddress,
            amount: order?.runeItem.tokenValue,
            status: 'available',
            txid: order?.runeItem.txid,
            type: 'payment',
            vout: order?.runeItem.vout,
            value: order?.runeItem.tokenValue,
          },
        ],
        seller_ordinal_address: null,
        service_fee: 0,
        status: order.status,
        total_value_input_seller: order.runeItem.outputValue,
        type: 'listing',
        utxo_address: order.sellerRuneAddress,
        utxo_address_type: 'payment',
      })),
    };
  }
}

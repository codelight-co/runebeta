import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import {
  CancelOrderDto,
  MarketRuneFilterDto,
  MarketRuneOrderFilterDto,
} from './dto';
import { User } from '../database/entities/user.entity';
import { Repository } from 'typeorm';
import { Order } from '../database/entities/order.entity';
import {
  IRuneListingState,
  IRunePostPSBTListing,
  ISelectPaymentUtxo,
} from 'src/common/interfaces/rune.interface';
import { SellerHandler } from 'src/common/handlers/runes/seller';
import { BuyerHandler } from 'src/common/handlers/runes/buyer';
import { RPCService, network } from 'src/common/utils/rpc';
import { BASE_URL, DUST_AMOUNT } from 'src/environments';
import { AddressTxsUtxo } from '@mempool/mempool.js/lib/interfaces/bitcoin/addresses';
import { BuyerOrderDto } from './dto/buyer-order.dto';
import { MergeSingers } from 'src/common/handlers/runes/merge';
import { TransactionRuneEntry } from '../database/entities/rune-entry.entity';
import { UsersService } from '../users/users.service';
import { TransactionsService } from '../transactions/transactions.service';
import { BroadcastTransactionDto } from '../transactions/dto';
import { RuneStat } from '../database/entities';
import { EOrderStatus } from 'src/common/enums';
import { OutpointRuneBalance } from '../database/entities/outpoint-rune-balance.entity';

@Injectable()
export class MarketsService implements OnModuleInit {
  constructor(
    private readonly httpService: HttpService,
    @Inject('ORDER_REPOSITORY')
    private orderRepository: Repository<Order>,
    @Inject('RUNE_ENTRY_REPOSITORY')
    private runeEntryRepository: Repository<TransactionRuneEntry>,
    @Inject('OUTPOINT_RUNE_BALANCE_REPOSITORY')
    private outpoinBalanceRepository: Repository<OutpointRuneBalance>,
    private readonly usersService: UsersService,
    private readonly transactionsService: TransactionsService,
  ) {}

  private rpcService: RPCService;

  async onModuleInit() {
    this.rpcService = new RPCService(BASE_URL, network);
  }

  async getRunes(marketRuneFilterDto: MarketRuneFilterDto) {
    const builder = this.runeEntryRepository
      .createQueryBuilder('rune')
      .leftJoinAndSelect('rune.stat', 'rune_stat')
      .offset(marketRuneFilterDto.offset)
      .limit(marketRuneFilterDto.limit);

    if (marketRuneFilterDto.sortBy) {
      builder.orderBy(
        marketRuneFilterDto.sortBy,
        marketRuneFilterDto.sortOrder?.toLocaleUpperCase() === 'DESC'
          ? 'DESC'
          : 'ASC',
      );
    }

    if (marketRuneFilterDto.search) {
      builder.andWhere('spaced_rune ILIKE :search', {
        search: `%${marketRuneFilterDto.search.split(' ').join('_')}%`,
      });
    }

    const runes = await builder.getMany();
    return {
      total: await builder.getCount(),
      limit: marketRuneFilterDto.limit,
      offset: marketRuneFilterDto.offset,
      runes: runes.map((rune) => ({
        change_24h: rune.stat.change_24h,
        floor_price: rune.stat.price,
        last_price: rune.stat.ma_price,
        marketcap: rune.stat.market_cap,
        order_sold: rune.stat.order_sold,
        token_holders: rune.stat.total_holders,
        id: rune.id,
        rune_id: rune.rune_id,
        rune_hex: rune.rune_hex,
        rune_name: rune.spaced_rune,
        total_supply: rune.stat.total_supply,
        total_volume: rune.stat.total_volume,
      })),
    };
  }

  async getRunesById(
    id: string,
    marketRuneOrderFilterDto: MarketRuneOrderFilterDto,
  ): Promise<any> {
    const builder = this.orderRepository
      .createQueryBuilder('order')
      .innerJoinAndMapOne(
        'order.runeInfo',
        TransactionRuneEntry,
        'runeInfo',
        `runeInfo.rune_id = order.rune_id`,
      )
      .leftJoinAndMapOne(
        'order.runeStat',
        RuneStat,
        'rune_stat',
        'rune_stat.rune_id = order.rune_id',
      )
      .where(`order.rune_id = :id`, { id });

    if (marketRuneOrderFilterDto.status) {
      builder.andWhere('order.status = :status', {
        status: marketRuneOrderFilterDto.status,
      });
    }
    if (marketRuneOrderFilterDto.owner_id) {
      builder.andWhere('order.user_id = :owner_id', {
        owner_id: marketRuneOrderFilterDto.owner_id,
      });
    }

    const total = await builder.getCount();

    if (marketRuneOrderFilterDto.offset) {
      builder
        .skip(marketRuneOrderFilterDto.offset)
        .take(marketRuneOrderFilterDto.limit || 10);
    }
    if (marketRuneOrderFilterDto.sortBy) {
      builder.orderBy(
        `order.${marketRuneOrderFilterDto.sortBy}`,
        marketRuneOrderFilterDto.sortOrder?.toLocaleUpperCase() === 'DESC'
          ? 'DESC'
          : 'ASC',
      );
      switch (marketRuneOrderFilterDto.sortBy) {
        case 'created_at':
          builder.orderBy(
            `order.createdAt`,
            marketRuneOrderFilterDto.sortOrder?.toLocaleUpperCase() === 'DESC'
              ? 'DESC'
              : 'ASC',
          );
          break;

        case 'price':
          builder.orderBy(
            `order.price`,
            marketRuneOrderFilterDto.sortOrder?.toLocaleUpperCase() === 'DESC'
              ? 'DESC'
              : 'ASC',
          );
          break;

        case 'change_24h':
          builder.orderBy(
            `rune_stat.change_24h`,
            marketRuneOrderFilterDto.sortOrder?.toLocaleUpperCase() === 'DESC'
              ? 'DESC'
              : 'ASC',
          );
          break;

        case 'volume_24h':
          builder.orderBy(
            `rune_stat.volume_24h`,
            marketRuneOrderFilterDto.sortOrder?.toLocaleUpperCase() === 'DESC'
              ? 'DESC'
              : 'ASC',
          );
          break;

        case 'total_volume':
          builder.orderBy(
            `rune_stat.total_volume`,
            marketRuneOrderFilterDto.sortOrder?.toLocaleUpperCase() === 'DESC'
              ? 'DESC'
              : 'ASC',
          );
          break;

        case 'market_cap':
          builder.orderBy(
            `rune_stat.market_cap`,
            marketRuneOrderFilterDto.sortOrder?.toLocaleUpperCase() === 'DESC'
              ? 'DESC'
              : 'ASC',
          );
          break;

        case 'total_supply':
          builder.orderBy(
            `rune_stat.total_supply`,
            marketRuneOrderFilterDto.sortOrder?.toLocaleUpperCase() === 'DESC'
              ? 'DESC'
              : 'ASC',
          );
          break;

        case 'holders':
          builder.orderBy(
            `rune_stat.total_holders`,
            marketRuneOrderFilterDto.sortOrder?.toLocaleUpperCase() === 'DESC'
              ? 'DESC'
              : 'ASC',
          );
          break;

        default:
          break;
      }
    } else {
      builder.orderBy('order.createdAt', 'DESC');
    }

    const orders = await builder.getMany();
    return {
      total,
      limit: marketRuneOrderFilterDto.limit,
      offset: marketRuneOrderFilterDto.offset,
      runes: orders.map((order) => ({
        id: order.id,
        amount_rune: order.runeItem.tokenValue,
        amount_rune_remain_seller: order.runeItem.outputValue,
        amount_satoshi: Number(order.runeItem.tokenValue) * order.price,
        buyer: {
          wallet_address: order.buyerRuneAddress || '',
        },
        txs: order.tx_hash || '',
        buyer_id: null,
        confirmed_at_block: 0,
        owner: {
          wallet_address: order.sellerRuneAddress,
        },
        owner_id: order.userId,
        price_per_unit: order.price,
        received_address:
          order.status === 'completed' ? order.buyerRuneAddress : '',
        confirmed: order.status === 'completed',
        rune_hex: order.runeInfo.rune_hex,
        rune_id: order.runeItem.id,
        rune_name: order.runeInfo.spaced_rune,
        rune_utxo: [
          {
            id: order.runeItem.id,
            address: order.sellerRuneAddress,
            amount: order.runeItem.tokenValue,
            status: 'available',
            txid: order.runeItem.txid,
            type: 'payment',
            vout: order.runeItem.vout,
            value: order.runeItem.tokenValue,
          },
        ],
        seller_ordinal_address: null,
        service_fee: 0,
        status: order.status,
        total_value_input_seller: order.runeItem.outputValue,
        type: 'listing',
        unit: '1',
        utxo_address: order.sellerRuneAddress,
        utxo_address_type: 'payment',
        created_at: order.createdAt,
        updated_at: order.updatedAt,
      })),
    };
  }

  async getStats() {
    const order_sold = await this.orderRepository.count({
      where: { status: 'completed' },
    });

    return {
      order_sold,
    };
  }

  async createSellOrder(body: IRuneListingState, user: User): Promise<Order> {
    const { seller } = body;
    if (!seller) {
      throw new BadRequestException('No Seller data found');
    }
    const listing: IRunePostPSBTListing = {
      id: seller.runeItem.id,
      price: seller.price,
      sellerReceiveAddress: seller.sellerReceiveAddress,
      signedListingPSBTBase64: seller.signedListingPSBTBase64,
    };
    const makerFeeBp = seller.makerFeeBp;
    const runeItem = seller.runeItem;

    // 1. Verify signature
    const isPass = await SellerHandler.verifySignedListingPSBTBase64(
      listing,
      makerFeeBp,
      { ...runeItem, owner: user.walletAddress },
    );
    if (!isPass) {
      throw new BadRequestException('Invalid signature');
    }

    // 3. Encode order signature
    // const algorithm = ENCRYPTION_ALGORITHM;
    // const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    // const iv = crypto.randomBytes(16);

    // const cipher = crypto.createCipheriv(algorithm, key, iv);
    // let encrypted = cipher.update(body.signedTx, 'utf8', 'hex');
    // encrypted += cipher.final('hex');

    return this.orderRepository.save({
      userId: user.id,
      rune_id: String(seller.runeItem.id),
      ...body.seller,
      status: 'listing',
    } as Order);
  }

  async generateUnsignedListingPSBT(
    body: IRuneListingState,
    user: User,
  ): Promise<IRuneListingState> {
    if (!user) {
      throw new BadRequestException('No user found');
    }

    const outputValue = await this.outpoinBalanceRepository
      .createQueryBuilder('outpoint')
      .innerJoinAndSelect(
        'outpoint.txOut',
        'txOut',
        'txOut.tx_hash = outpoint.tx_hash AND txOut.vout = outpoint.vout',
      )
      .where('outpoint.tx_hash = :tx_hash', {
        tx_hash: body.seller.runeItem.txid,
      })
      .andWhere('txOut.spent = false')
      .getOne();
    if (!outputValue) {
      throw new BadRequestException('No output value found');
    }
    body.seller.runeItem = {
      ...body.seller.runeItem,
      outputValue: outputValue.txOut.value,
    };

    const { seller } = body;
    if (!seller) {
      throw new BadRequestException('No Seller data found');
    }

    return SellerHandler.generateUnsignedPsbt(body);
  }

  async selectPaymentUTXOs(
    body: ISelectPaymentUtxo,
    user: User,
  ): Promise<AddressTxsUtxo[]> {
    if (!user) {
      throw new BadRequestException('No user found');
    }

    const { utxos, amount, vinsLength, voutsLength, feeRateTier } = body;

    return BuyerHandler.selectPaymentUTXOs(
      utxos,
      amount,
      vinsLength,
      voutsLength,
      feeRateTier,
      this.rpcService,
    );
  }

  async generateUnsignedBuyingPSBT(
    body: BuyerOrderDto,
    user: User,
  ): Promise<IRuneListingState> {
    if (!user) {
      throw new BadRequestException('No user found');
    }

    const { buyer } = body.buyerState;
    if (!buyer) {
      throw new BadRequestException('No Buyer data found');
    }

    // Get order by ids
    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.id IN (:...ids)', { ids: body.orderIds })
      .getMany();
    if (orders.length !== body.orderIds.length) {
      throw new BadRequestException('Invalid order ids');
    }
    const seller_items = orders.map(
      (order) =>
        ({
          buyer: {},
          seller: {
            makerFeeBp: order.makerFeeBp,
            price: order.price,
            runeItem: order.runeItem,
            sellerReceiveAddress: order.sellerReceiveAddress,
            signedListingPSBTBase64: order.signedListingPSBTBase64,
            unsignedListingPSBTBase64: order.unsignedListingPSBTBase64,
            sellerRuneAddress: order.sellerRuneAddress,
            publicKey: order.publicKey,
            tapInternalKey: order.tapInternalKey,
          },
        }) as IRuneListingState,
    );

    return BuyerHandler.generateUnsignedBuyingPSBTBase64(
      body.buyerState,
      seller_items,
    );
  }

  async mergeSignedBuyingPSBT(body: BuyerOrderDto, user: User): Promise<any> {
    if (!user) {
      throw new BadRequestException('No user found');
    }

    const { buyer } = body.buyerState;
    if (!buyer) {
      throw new BadRequestException('No Buyer data found');
    }

    // Get order by ids
    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.id IN (:...ids)', { ids: body.orderIds })
      .getMany();
    if (orders.length !== body.orderIds.length) {
      throw new BadRequestException('Invalid order ids');
    }

    const seller_items = orders.map(
      (order) =>
        ({
          buyer: {},
          seller: {
            makerFeeBp: order.makerFeeBp,
            price: order.price,
            runeItem: order.runeItem,
            sellerReceiveAddress: order.sellerReceiveAddress,
            signedListingPSBTBase64: order.signedListingPSBTBase64,
            unsignedListingPSBTBase64: order.unsignedListingPSBTBase64,
            sellerRuneAddress: order.sellerRuneAddress,
            publicKey: order.publicKey,
            tapInternalKey: order.tapInternalKey,
          },
        }) as IRuneListingState,
    );
    const txHash = MergeSingers.mergeSignedBuyingPSBTBase64(
      body.buyerState,
      seller_items,
    );

    const broadcastTransaction =
      await this.transactionsService.broadcastTransaction({
        rawTransaction: txHash,
      } as BroadcastTransactionDto);

    if (broadcastTransaction) {
      console.log('broadcastTransaction :>> ', broadcastTransaction);

      await this.orderRepository
        .createQueryBuilder()
        .update()
        .set({
          status: EOrderStatus.COMPLETED,
          // tx_hash: broadcastTransaction.txid,
          buyerId: user.id,
          buyerRuneAddress: buyer.buyerTokenReceiveAddress,
        })
        .where('id IN (:...ids)', { ids: body.orderIds })
        .execute();
    }

    return broadcastTransaction;
  }

  async selectUTXOsForBuying(body: BuyerOrderDto, user: User): Promise<any> {
    const utxos = await this.usersService.getMyUtxo(user);
    // Get order by ids
    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.id IN (:...ids)', { ids: body.orderIds })
      .getMany();
    if (orders.length !== body.orderIds.length) {
      throw new BadRequestException('Invalid order ids');
    }

    return BuyerHandler.selectPaymentUTXOs(
      utxos as AddressTxsUtxo[],
      Number(orders[0].runeItem.tokenValue) + 1000 + DUST_AMOUNT * 2,
      2,
      5,
      'minimumFee',
      this.rpcService,
    );
  }

  async cancelSellOrder(body: CancelOrderDto, user: User): Promise<any> {
    // Get order by ids
    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.id IN (:...ids)', { ids: body.orderIds })
      .andWhere('order.user_id = :userId', { userId: user.id })
      .andWhere('order.status = :status', { status: 'listing' })
      .getMany();
    if (orders.length !== body.orderIds.length) {
      throw new BadRequestException('Invalid order ids');
    }
    const updated = await this.orderRepository
      .createQueryBuilder()
      .update()
      .set({ status: 'cancelled' })
      .where('id IN (:...ids)', { ids: body.orderIds })
      .andWhere('user_id = :userId', { userId: user.id })
      // .andWhere('status = :status', { status: 'listing' })
      .execute();
    if (!updated.affected) {
      throw new BadRequestException('Failed to cancel order');
    }

    return { message: 'Order cancelled' };
  }
}

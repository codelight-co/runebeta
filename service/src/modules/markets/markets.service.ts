import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Inject,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { MarketRuneFilterDto, MarketRuneOrderFilterDto } from './dto';
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
import { BASE_URL } from 'src/environments';
import { AddressTxsUtxo } from '@mempool/mempool.js/lib/interfaces/bitcoin/addresses';
import { BuyerOrderDto } from './dto/buyer-order.dto';
import { MergeSingers } from 'src/common/handlers/runes/merge';

@Injectable()
export class MarketsService implements OnModuleInit {
  constructor(
    private readonly httpService: HttpService,
    @Inject('ORDER_REPOSITORY')
    private orderRepository: Repository<Order>,
  ) {}

  private rpcService: RPCService;

  async onModuleInit() {
    this.rpcService = new RPCService(BASE_URL, network);
  }

  async getRunes(marketRuneFilterDto: MarketRuneFilterDto) {
    const res = await this.httpService
      .get('https://api.runealpha.xyz/market/runes', {
        params: marketRuneFilterDto,
      })
      .toPromise();

    return res.data?.data;
  }

  async getRunesById(
    id: string,
    marketRuneOrderFilterDto: MarketRuneOrderFilterDto,
  ) {
    const res = await this.httpService
      .get(`https://api.runealpha.xyz/market/orders/rune/${id}`, {
        params: marketRuneOrderFilterDto,
      })
      .toPromise();

    return res.data?.data;
  }

  async getStats() {
    const res = await this.httpService
      .get('https://api.runealpha.xyz/market/stats')
      .toPromise();

    return res.data?.data;
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
      ...body.seller,
    } as Order);
  }

  async generateUnsignedListingPSBT(
    body: IRuneListingState,
    user: User,
  ): Promise<IRuneListingState> {
    if (!user) {
      throw new BadRequestException('No user found');
    }

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

    return MergeSingers.mergeSignedBuyingPSBTBase64(
      body.buyerState,
      seller_items,
    );
  }
}

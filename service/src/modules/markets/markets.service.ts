import { HttpService } from '@nestjs/axios';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  CreateOrderDto,
  MarketRuneFilterDto,
  MarketRuneOrderFilterDto,
} from './dto';
import { User } from '../database/entities/user.entity';
import { Repository } from 'typeorm';
import { Order } from '../database/entities/order.entity';
import * as crypto from 'crypto';
import { ENCRYPTION_ALGORITHM, ENCRYPTION_KEY } from 'src/environments';
import { IRuneListingState } from 'src/common/interfaces/rune.interface';

@Injectable()
export class MarketsService {
  constructor(
    private readonly httpService: HttpService,
    @Inject('ORDER_REPOSITORY')
    private orderRepository: Repository<Order>,
  ) {}

  async getRunes(marketRuneFilterDto: MarketRuneFilterDto) {
    const res = await this.httpService
      .get('https://api.runealpha.xyz/market/runes', {
        params: marketRuneFilterDto,
      })
      .toPromise();

    return res.data;
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

    return res.data;
  }

  async getStats() {
    const res = await this.httpService
      .get('https://api.runealpha.xyz/market/stats')
      .toPromise();

    return res.data;
  }

  async createSellOrder(body: CreateOrderDto, user: User) {
    // 1. Verify order data
    // 2. Verify signature

    // 3. Encode order signature
    const algorithm = ENCRYPTION_ALGORITHM;
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(body.signedTx, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // 4. Save order to database
    const order = await this.orderRepository.save({
      txHash: '',
      symbol: '',
      runeId: '',
      amount: body.amount,
      price: body.price,
      userId: user.id,
      signedTx: encrypted,
    } as Order);

    return { ...order, signedTx: null };
  }

  async generateUnsignedListingPSBT(body: IRuneListingState, user: User) {
    console.log('body :>> ', body);
    console.log('user :>> ', user);
    const { seller } = body;
    if (!seller) {
      throw new BadRequestException('No Seller data found');
    }
  }
}

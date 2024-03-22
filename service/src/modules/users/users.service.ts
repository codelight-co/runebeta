import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { User } from '../database/entities/user.entity';
import { Repository } from 'typeorm';
import mempoolJS from '@mempool/mempool.js';
import { BITCOIN_NETWORK } from 'src/environments';
import { MempoolReturn } from '@mempool/mempool.js/lib/interfaces/index';
import { AddressTxsUtxo } from '@mempool/mempool.js/lib/interfaces/bitcoin/addresses';
import { TransactionOut } from '../database/entities/transaction-out.entity';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @Inject('USER_REPOSITORY')
    private userRepository: Repository<User>,
    @Inject('TRANSACTION_OUT_REPOSITORY')
    private transactionOutRepository: Repository<TransactionOut>,
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

  async getMyRunes() {
    // const utxo = await this.transactionOutRepository
    //   .createQueryBuilder('transaction_out')
    //   .where('address = :address', { address: user.walletAddress })
    //   .andWhere('spent = false')
    //   .getMany();

    // return utxo;
    return {
      availableBalance: 1000,
      availableUTXOs: [
        {
          txid: '49638daaaacf7092f059431de4caaea5ca3f7d73591b606b9dc2fce620ab2391',
          vout: 0,
          value: 546,
          amount: '1000',
          type: 'payment',
          address: 'bc1qufsll34tmz8r02mg6yupkmefmvaxzk27x99qz0',
        },
      ],
    };
  }
}

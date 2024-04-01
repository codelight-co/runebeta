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

  async getMyRunes(user: User): Promise<TransactionOut[]> {
    return this.transactionOutRepository
      .createQueryBuilder('transaction_out')
      .where('address = :address', {
        address: user.walletAddress,
      })
      .andWhere('spent = false')
      .getMany();
  }

  async getMyRuneById(user: User, id: string): Promise<TransactionOut> {
    const data = await this.transactionOutRepository.query(`
    select to2.address, tre.spaced_rune ,orb.*
    from transaction_outs to2 
    inner join outpoint_rune_balances orb on orb.tx_hash = to2.tx_hash
    inner join transaction_rune_entries tre on tre.rune_id = orb.rune_id 
    where spent = false and to2.address is not null and tre.rune_id = '${id}' and to2.address = '${user.walletAddress}'
    order by balance_value desc
    limit 10`);

    return data;
  }
}

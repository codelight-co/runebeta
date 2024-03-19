import { Inject, Injectable } from '@nestjs/common';
import { User } from '../database/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @Inject('USER_REPOSITORY')
    private userRepository: Repository<User>,
  ) {}

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
}

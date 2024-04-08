import { Injectable, UnauthorizedException } from '@nestjs/common';
import { VerifyDto } from './dto/verify.dto';
import { Verifier } from 'bip322-js';
import { randomInt } from 'src/common/utils';
import Redis from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly userService: UsersService,
    private jwtService: JwtService,
  ) {}

  // Verify user wallet address by signature
  async verify(verifyDto: VerifyDto) {
    // Get nonce from redis
    const nonce = await this.redis.get(`nonce:${verifyDto.address}`);
    if (!nonce) {
      // throw 401 if nonce not found
      throw new UnauthorizedException('Nonce not found');
    }

    // Uncomment this code to verify signature
    const isPass = Verifier.verifySignature(
      verifyDto.address,
      nonce,
      verifyDto.signature,
    );
    if (!isPass) {
      throw new UnauthorizedException('Signature not match');
    }

    // Check if user exists in database
    let user = await this.userService.findOneByWalletAddress(verifyDto.address);
    if (!user) {
      // Init user if not exists
      user = await this.userService.create(verifyDto.address);
    }

    // Sync jwt token with user
    const payload = { sub: user.id };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  // Reuqest login by signature
  async requestLogin(wallerAddress: string) {
    // Random nonce for signature
    const nonce = randomInt(10);

    await this.redis.set(`nonce:${wallerAddress}`, nonce, 'EX', 360);

    return {
      nonce,
    };
  }
}

import {
  Controller,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserDecorator } from 'src/common/decorators/user.decorator';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { CoreTransformInterceptor } from 'src/common/interceptors/coreTransform.interceptor';
import { User } from '../database/entities/user.entity';
import { UsersService } from './users.service';
import { AddressTxsUtxo } from '@mempool/mempool.js/lib/interfaces/bitcoin/addresses';

@Controller('users')
@UseInterceptors(CoreTransformInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@UserDecorator() user: User) {
    return user;
  }

  // Get my utxo
  @UseGuards(AuthGuard)
  @Get('my-utxo')
  getUtxo(@UserDecorator() user: User): Promise<AddressTxsUtxo[]> {
    return this.usersService.getMyUtxo(user);
  }

  // Get my runes
  @UseGuards(AuthGuard)
  @Get('my-runes')
  getMyRunes(@UserDecorator() user: User) {
    return this.usersService.getMyRunes(user);
  }

  // Get my rune by id
  @UseGuards(AuthGuard)
  @Get('my-runes/:id')
  getMyRuneById(@UserDecorator() user: User, @Param('id') id: string) {
    return this.usersService.getMyRuneById(user, id);
  }
}

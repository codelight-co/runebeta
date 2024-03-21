import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DatabaseModule } from '../database/database.module';
import { authProviders } from './auth.providers';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';

@Module({
  imports: [DatabaseModule, UsersModule],
  providers: [AuthService, UsersService, ...authProviders],
  controllers: [AuthController],
})
export class AuthModule {}

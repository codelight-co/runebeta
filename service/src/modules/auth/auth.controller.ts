import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { VerifyDto } from './dto/verify.dto';
import { CoreTransformInterceptor } from 'src/common/interceptors/coreTransform.interceptor';

@Controller('auth')
@UseInterceptors(CoreTransformInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Verify user wallet address by signature
  @Post('verify')
  async verify(@Body() verifyDto: VerifyDto) {
    return this.authService.verify(verifyDto);
  }

  // Reuqest login by signature
  @Get('request/login/:walletAddress')
  async requestLogin(@Param('walletAddress') walletAddress: string) {
    return this.authService.requestLogin(walletAddress);
  }
}

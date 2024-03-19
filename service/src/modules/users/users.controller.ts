import {
  Controller,
  Get,
  UseGuards,
  Request,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { CoreTransformInterceptor } from 'src/common/interceptors/coreTransform.interceptor';

@Controller('users')
@UseInterceptors(CoreTransformInterceptor)
export class UsersController {
  constructor() {}

  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}

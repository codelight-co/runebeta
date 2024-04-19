import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class SecretAuthGuard implements CanActivate {
  private readonly logger = new Logger(SecretAuthGuard.name);

  constructor() {}

  /* eslint-disable-next-line */
  // @ts-ignore
  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean | Observable<boolean>> {
    try {
      const request = context.switchToHttp().getRequest();
      if (request.headers['x-api-key']) {
        const requestSecret = request.headers['x-api-key'];
        const adminSecret = process.env.ADMIN_SECRET;

        return requestSecret === adminSecret;
      }

      return false;
    } catch (error) {
      this.logger.error(error);

      throw new BadRequestException(error);
    }
  }
}

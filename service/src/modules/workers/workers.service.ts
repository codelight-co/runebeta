import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WorkersService {
  constructor() {}
  private readonly logger = new Logger(WorkersService.name);
}

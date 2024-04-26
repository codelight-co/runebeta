import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { PROCESS, PROCESSOR } from 'src/common/enums';
import { TransactionRuneEntry } from '../database/entities/indexer/rune-entry.entity';
import { StatsService } from '../stats/stats.service';
import { Order } from '../database/entities/marketplace/order.entity';

@Processor(PROCESSOR.STAT_QUEUE)
export class WorkersProcessor {
  constructor(
    @InjectQueue(PROCESSOR.STAT_QUEUE)
    private readonly statQueue: Queue,
    private readonly statsService: StatsService,
  ) {}
  private readonly logger = new Logger(WorkersProcessor.name);

  @Process({ name: PROCESS.STAT_QUEUE.CALCULATE_RUNE_STAT, concurrency: 2 })
  async handlerSendFirebaseMessage(job: Job<any>): Promise<void> {
    // this.logger.log(`Processing job ${job.id}`);

    const data = job.data as {
      blockHeight: number;
      rune: TransactionRuneEntry;
    };

    await this.statsService.calculateRuneStat(data.blockHeight, data.rune);
  }

  @Process({ name: PROCESS.STAT_QUEUE.CALCULATE_ORDER_STAT, concurrency: 2 })
  async handlerCalculateOrderStats(job: Job<any>): Promise<void> {
    const data = job.data as {
      blockHeight: number;
      order: Order;
    };

    await this.statsService.calculateOrderStats(data.blockHeight, data.order);
  }
}

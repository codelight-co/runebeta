import { Injectable, OnModuleInit } from '@nestjs/common';
import { TaskService } from './modules/task-schedule/task.service';
import { RunesService } from './modules/runes/runes.service';
import { StatsService } from './modules/stats/stats.service';
import { MODE } from './environments';
import { EAppMode } from './common/enums';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    private readonly taskService: TaskService,
    private readonly runeService: RunesService,
    private readonly statsService: StatsService,
  ) {}

  async onModuleInit() {
    if (MODE === EAppMode.SCHEDULER) {
      // Continue processing etching every 5 seconds
      this.taskService.addNewJob(
        'processEtching',
        async () => await this.runeService.processEtching(),
        '*/5',
      );

      // Calculate rune stats every 5 seconds
      this.taskService.addNewJob(
        'calculateRuneStats',
        async () => await this.statsService.calculateNetworkStats(),
        '*/3',
      );
    }
  }

  getHello(): string {
    return 'Hi there! Welcome to the MagicRune!';
  }
}

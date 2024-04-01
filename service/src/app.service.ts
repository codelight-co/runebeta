import { Injectable, OnModuleInit } from '@nestjs/common';
import { TaskService } from './modules/task-schedule/task.service';
import { RunesService } from './modules/runes/runes.service';

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    private readonly taskService: TaskService,
    private readonly runeService: RunesService,
  ) {}

  async onModuleInit() {
    this.taskService.addNewJob(
      'test',
      async () => await this.runeService.processEtching(),
      '*/5',
    );
  }

  getHello(): string {
    return 'Hello World!';
  }
}

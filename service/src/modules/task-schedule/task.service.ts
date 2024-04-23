import { CronJob } from 'cron';
import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';

@Injectable()
export class TaskService {
  constructor(private readonly schedulerRegistry: SchedulerRegistry) {}

  addNewJob(
    jobName: string,
    onTick: () => void,
    seconds?: string | number,
    minutes?: string | number,
    hours?: string | number,
    day?: string | number,
    month?: string | number,
    year?: string | number,
  ) {
    const job = new CronJob(
      `${seconds ?? '*'} ${minutes ?? '*'} ${hours ?? '*'} ${day ?? '*'} ${month ?? '*'} ${year ?? '*'}`,
      () => {
        onTick();
      },
    );
    this.schedulerRegistry.addCronJob(jobName, job);
    job.start();
  }

  stopCronJob(jobName: string) {
    const job = this.schedulerRegistry.getCronJob(jobName);
    job.stop();
  }

  deleteJob(jobName: string) {
    this.schedulerRegistry.deleteCronJob(jobName);
  }

  getCronJobs() {
    return this.schedulerRegistry.getCronJobs();
  }

  getCronJob(jobName: string) {
    return this.schedulerRegistry.getCronJob(jobName);
  }
}

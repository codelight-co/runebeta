import { Module } from '@nestjs/common';
import { IndexersService } from './indexers.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule.register({
      timeout: 15000,
    }),
  ],
  providers: [IndexersService],
  exports: [IndexersService],
})
export class IndexersModule {}

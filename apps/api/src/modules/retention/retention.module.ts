import { Module } from '@nestjs/common';
import { RetentionScheduler } from './retention.scheduler';
import { RetentionService } from './retention.service';

/** Bounded retention for traffic-driven data (page views, the 404 log). */
@Module({
  providers: [RetentionService, RetentionScheduler],
  exports: [RetentionService, RetentionScheduler],
})
export class RetentionModule {}

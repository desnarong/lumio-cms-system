import { Module } from '@nestjs/common';
import { RateLimitGuard } from '../../common/rate-limit.guard';
import { UpdatesController } from './updates.controller';
import { UpdatesService } from './updates.service';

@Module({
  controllers: [UpdatesController],
  providers: [UpdatesService, RateLimitGuard],
  exports: [UpdatesService],
})
export class UpdatesModule {}

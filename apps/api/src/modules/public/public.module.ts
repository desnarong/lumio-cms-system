import { Module } from '@nestjs/common';
import { EdgeCollectGuard } from '../../common/edge-collect.guard';
import { RateLimitGuard } from '../../common/rate-limit.guard';
import { PublicController } from './public.controller';
import { PreviewController } from './preview.controller';
import { PublicService } from './public.service';
import { PublicTrackingService } from './public-tracking.service';

@Module({
  controllers: [PublicController, PreviewController],
  providers: [PublicService, PublicTrackingService, RateLimitGuard, EdgeCollectGuard],
  exports: [PublicService, PublicTrackingService],
})
export class PublicModule {}

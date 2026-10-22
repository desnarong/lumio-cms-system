import { Module } from '@nestjs/common';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, SiteGuard, RolesGuard],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

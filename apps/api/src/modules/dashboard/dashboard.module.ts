import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [AuditModule],
  controllers: [DashboardController],
  providers: [DashboardService, SiteGuard, RolesGuard],
  exports: [DashboardService],
})
export class DashboardModule {}

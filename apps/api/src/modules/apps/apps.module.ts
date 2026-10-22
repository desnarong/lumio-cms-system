import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { AppBridgeService } from './app-bridge.service';
import { AppManifestService } from './app-manifest.service';
import { AppsController } from './apps.controller';
import { AppsService } from './apps.service';

@Module({
  imports: [AuditModule],
  controllers: [AppsController],
  providers: [AppsService, AppBridgeService, AppManifestService, SiteGuard, RolesGuard],
  exports: [AppsService, AppBridgeService, AppManifestService],
})
export class AppsModule {}

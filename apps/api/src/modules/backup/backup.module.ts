import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { MediaModule } from '../media/media.module';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { BackupController } from './backup.controller';
import { BackupScheduler } from './backup.scheduler';
import { BackupService } from './backup.service';

@Module({
  imports: [AuditModule, MediaModule],
  controllers: [BackupController],
  providers: [BackupService, BackupScheduler, SiteGuard, RolesGuard],
  exports: [BackupService, BackupScheduler],
})
export class BackupModule {}

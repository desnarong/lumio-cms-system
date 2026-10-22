import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { GlobalBlocksController } from './global-blocks.controller';
import { GlobalBlocksService } from './global-blocks.service';

@Module({
  imports: [AuditModule],
  controllers: [GlobalBlocksController],
  providers: [GlobalBlocksService, SiteGuard, RolesGuard],
  exports: [GlobalBlocksService],
})
export class GlobalBlocksModule {}

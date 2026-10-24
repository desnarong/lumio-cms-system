import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PublishModule } from '../publish/publish.module';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { GlobalBlocksController } from './global-blocks.controller';
import { GlobalBlocksService } from './global-blocks.service';

@Module({
  imports: [AuditModule, PublishModule],
  controllers: [GlobalBlocksController],
  providers: [GlobalBlocksService, SiteGuard, RolesGuard],
  exports: [GlobalBlocksService],
})
export class GlobalBlocksModule {}

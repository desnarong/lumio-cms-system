import { Module } from '@nestjs/common';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { RedirectsController } from './redirects.controller';
import { RedirectsService } from './redirects.service';

@Module({
  controllers: [RedirectsController],
  providers: [RedirectsService, SiteGuard, RolesGuard],
  exports: [RedirectsService],
})
export class RedirectsModule {}

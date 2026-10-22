import { Module } from '@nestjs/common';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';

@Module({
  controllers: [SeoController],
  providers: [SeoService, SiteGuard, RolesGuard],
  exports: [SeoService],
})
export class SeoModule {}

import { Module } from '@nestjs/common';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { SectionTemplatesController } from './section-templates.controller';
import { SectionTemplatesService } from './section-templates.service';

@Module({
  controllers: [SectionTemplatesController],
  providers: [SectionTemplatesService, SiteGuard, RolesGuard],
  exports: [SectionTemplatesService],
})
export class SectionTemplatesModule {}
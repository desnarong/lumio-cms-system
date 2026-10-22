import { Module } from '@nestjs/common';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { TemplatesModule } from '../templates/templates.module';
import { DesignController } from './design.controller';
import { DesignService } from './design.service';

@Module({
  imports: [TemplatesModule],
  controllers: [DesignController],
  providers: [DesignService, SiteGuard, RolesGuard],
  exports: [DesignService],
})
export class DesignModule {}
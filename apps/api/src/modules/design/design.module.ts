import { Module } from '@nestjs/common';
import { PublishModule } from '../publish/publish.module';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { TemplatesModule } from '../templates/templates.module';
import { DesignController } from './design.controller';
import { DesignService } from './design.service';

@Module({
  imports: [TemplatesModule, PublishModule],
  controllers: [DesignController],
  providers: [DesignService, SiteGuard, RolesGuard],
  exports: [DesignService],
})
export class DesignModule {}
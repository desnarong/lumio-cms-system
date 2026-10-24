import { Module } from '@nestjs/common';
import { PublishModule } from '../publish/publish.module';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { MenusController } from './menus.controller';
import { MenusService } from './menus.service';

@Module({
  imports: [PublishModule],
  controllers: [MenusController],
  providers: [MenusService, SiteGuard, RolesGuard],
  exports: [MenusService],
})
export class MenusModule {}
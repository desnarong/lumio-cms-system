import { Module } from '@nestjs/common';
import { RateLimitGuard } from '../../common/rate-limit.guard';
import { AuditModule } from '../audit/audit.module';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';

@Module({
  imports: [AuditModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService, SiteGuard, RolesGuard, RateLimitGuard],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}

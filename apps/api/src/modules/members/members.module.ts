import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({
  imports: [BillingModule],
  controllers: [MembersController],
  providers: [MembersService, SiteGuard, RolesGuard],
  exports: [MembersService],
})
export class MembersModule {}

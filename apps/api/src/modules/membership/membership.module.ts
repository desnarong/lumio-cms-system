import { Module } from '@nestjs/common';
import { RateLimitGuard } from '../../common/rate-limit.guard';
import { EmailModule } from '../email/email.module';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { MembershipController } from './membership.controller';
import { MembershipService } from './membership.service';
import { MembershipWebhookController } from './membership-webhook.controller';
import { ReaderPublicController } from './reader-public.controller';
import { ReaderService } from './reader.service';

/**
 * Reader accounts and paid memberships (docs/PROGRESS.md batch A). The whole
 * module is a licensed capability: `FeatureGuard` on the admin controller closes
 * it, and the public routes answer 404 for a site that has it switched off.
 */
@Module({
  imports: [EmailModule],
  controllers: [MembershipController, ReaderPublicController, MembershipWebhookController],
  providers: [MembershipService, ReaderService, SiteGuard, RolesGuard, RateLimitGuard],
  exports: [MembershipService, ReaderService],
})
export class MembershipModule {}

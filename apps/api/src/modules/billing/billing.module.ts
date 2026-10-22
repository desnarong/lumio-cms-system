import { Module } from '@nestjs/common';
import { CommerceModule } from '../commerce/commerce.module';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { BillingController } from './billing.controller';
import { BillingWebhookController } from './billing.webhook.controller';
import { QuotaService } from './quota.service';
import { StripeService } from './stripe.service';
import { BillingService } from './billing.service';

@Module({
  imports: [CommerceModule],
  controllers: [BillingController, BillingWebhookController],
  providers: [BillingService, StripeService, QuotaService, SiteGuard, RolesGuard],
  exports: [BillingService, QuotaService],
})
export class BillingModule {}

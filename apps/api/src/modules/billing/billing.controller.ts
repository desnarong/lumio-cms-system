import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import {
  changePlanInputSchema,
  checkoutInputSchema,
  type ApiLocale,
  type Role,
} from '@lumio/shared';
import { ok } from '../../common/api-response';
import { RequestLocale } from '../../common/request-locale.decorator';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { BillingService } from './billing.service';

/** Only the owner manages the plan and payment (docs/design/13-rbac.md). */
const BILLING_ROLES: Role[] = ['owner'];

/** Plan, usage and invoices (docs/design/05-admin-ia.md "ตั้งค่า › แพ็กเกจ & การชำระเงิน"). */
@Controller('v1/billing')
@UseGuards(AuthGuard, SiteGuard, RolesGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  @Roles(...BILLING_ROLES)
  async summary(@CurrentSite() siteId: string, @RequestLocale() locale: ApiLocale) {
    return ok(await this.billing.summary(siteId, locale));
  }

  /** Starts a Stripe Checkout (card or PromptPay) for a paid plan. */
  @Post('checkout')
  @Roles(...BILLING_ROLES)
  async checkout(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
    @RequestLocale() locale: ApiLocale,
  ) {
    const input = checkoutInputSchema.parse(body);
    return ok(await this.billing.startCheckout(siteId, input, user.id, locale, user.email));
  }

  /** Stops the next renewal; the paid period stays (docs/design/18-deployment.md 18.7). */
  @Post('cancel')
  @Roles(...BILLING_ROLES)
  async cancel(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @RequestLocale() locale: ApiLocale,
  ) {
    return ok(await this.billing.cancelSubscription(siteId, user.id, locale));
  }

  @Patch('plan')
  @Roles(...BILLING_ROLES)
  async changePlan(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
    @RequestLocale() locale: ApiLocale,
  ) {
    const { plan } = changePlanInputSchema.parse(body);
    return ok(await this.billing.changePlan(siteId, plan, user.id, locale));
  }
}

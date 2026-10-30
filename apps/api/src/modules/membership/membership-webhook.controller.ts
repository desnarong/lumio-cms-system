import { Controller, Headers, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ok } from '../../common/api-response';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit.guard';
import { stripeWebhookSecret, verifyStripeSignature } from '../billing/stripe';
import { MembershipService } from './membership.service';

/**
 * Stripe webhook for reader subscriptions (docs/PROGRESS.md batch A). It lives
 * outside the `:host` routes because one Stripe account serves every site: the
 * site comes from the subscription metadata, and only a verified signature can
 * reach the handler.
 */
@Controller('v1/public')
export class MembershipWebhookController {
  constructor(private readonly membership: MembershipService) {}

  @Post('membership/webhook')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 240, windowMs: 60_000 })
  async webhook(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature?: string,
  ) {
    const payload = request.rawBody ?? Buffer.from(JSON.stringify(request.body ?? {}));
    const event = verifyStripeSignature(payload, signature, stripeWebhookSecret());
    return ok(await this.membership.handleStripeEvent(event));
  }
}

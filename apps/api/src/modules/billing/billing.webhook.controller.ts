import { Controller, Headers, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ok } from '../../common/api-response';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit.guard';
import { BillingService } from './billing.service';
import { stripeWebhookSecret, verifyStripeSignature } from './stripe';

/** Stripe retries, so the endpoint has room without being an open door. */
const WEBHOOK_RATE_LIMIT = { limit: 240, windowMs: 60_000 };

/**
 * Stripe webhook (docs/design/18-deployment.md 18.7). It has no session and no
 * site header: the request is authenticated by the HMAC signature over the exact
 * bytes, which is why `rawBody` is enabled in `main.ts`. Only a verified event can
 * mark an invoice paid.
 */
@Controller('v1/billing')
export class BillingWebhookController {
  constructor(private readonly billing: BillingService) {}

  @Post('webhook')
  @UseGuards(RateLimitGuard)
  @RateLimit(WEBHOOK_RATE_LIMIT)
  async webhook(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature?: string,
  ) {
    const payload = request.rawBody ?? Buffer.from(JSON.stringify(request.body ?? {}));
    const event = verifyStripeSignature(payload, signature, stripeWebhookSecret());
    return ok(await this.billing.handleStripeEvent(event));
  }
}

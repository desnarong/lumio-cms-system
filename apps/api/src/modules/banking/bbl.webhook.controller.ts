import { Controller, Headers, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ok } from '../../common/api-response';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit.guard';
import { BblGatewayService } from './bbl-gateway.service';

/** The bank retries failed callbacks, so the endpoint has room without being open. */
const WEBHOOK_RATE_LIMIT = { limit: 240, windowMs: 60_000 };

/**
 * Bangkok Bank payment callback (docs/design/12-api.md 12.10). No session and no
 * site header: the request is authenticated by the HMAC over the exact bytes,
 * which is why `rawBody` is enabled in `main.ts`. Only a verified callback can
 * mark an order paid.
 */
@Controller('v1/public/banking/bbl')
export class BblWebhookController {
  constructor(private readonly gateway: BblGatewayService) {}

  @Post('webhook')
  @UseGuards(RateLimitGuard)
  @RateLimit(WEBHOOK_RATE_LIMIT)
  async webhook(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers('x-bbl-signature') signature?: string,
  ) {
    const payload = request.rawBody ?? Buffer.from(JSON.stringify(request.body ?? {}));
    return ok(await this.gateway.handleWebhook(payload, signature));
  }
}

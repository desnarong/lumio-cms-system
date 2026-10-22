import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { submitFormInputSchema } from '@lumio/shared';
import type { Request } from 'express';
import { ok } from '../../common/api-response';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit.guard';
import { FormsService } from './forms.service';

/**
 * Anonymous submit for a form on a public page (docs/design/12-api.md 12.9).
 * No auth guard on purpose: the tenant comes from the host, the honeypot filters
 * bots, and the route is capped at 20 submissions a minute per IP.
 */
@Controller('v1/public/:host/forms')
@UseGuards(RateLimitGuard)
export class PublicFormsController {
  constructor(private readonly forms: FormsService) {}

  @Post(':formId/submit')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  async submit(
    @Param('host') host: string,
    @Param('formId') formId: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const input = submitFormInputSchema.parse(body);
    return ok(
      await this.forms.submitPublic(host, formId, input, {
        ip: request.ip ?? null,
        userAgent: request.headers['user-agent'] ?? null,
      }),
    );
  }
}

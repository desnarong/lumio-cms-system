import { Controller, Get, Header, Param, UseGuards } from '@nestjs/common';
import { ok } from '../../common/api-response';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit.guard';
import { PublicService } from './public.service';

/**
 * Draft preview for the editor's "ดูตัวอย่าง" button
 * (docs/design/10-architecture.md 10.4). No login: the signed token is the
 * credential, it names exactly one page, and it expires within the hour. The
 * response is never cached and never indexed.
 */
@Controller('v1/preview')
@UseGuards(RateLimitGuard)
export class PreviewController {
  constructor(private readonly publicContent: PublicService) {}

  @Get(':token')
  @RateLimit({ limit: 120, windowMs: 60_000 })
  @Header('cache-control', 'no-store')
  @Header('x-robots-tag', 'noindex, nofollow')
  @Header('referrer-policy', 'no-referrer')
  async page(@Param('token') token: string) {
    return ok(await this.publicContent.preview(token.slice(0, 500)));
  }
}

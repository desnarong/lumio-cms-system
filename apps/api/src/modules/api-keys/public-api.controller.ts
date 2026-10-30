import { Controller, Get, Headers, Param, Query, UseGuards } from '@nestjs/common';
import { publicApiListQuerySchema } from '@lumio/shared';
import { ok } from '../../common/api-response';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit.guard';
import { ApiKeysService } from './api-keys.service';

const safeSlug = (slug: string): string => slug.slice(0, 200);

const safeLocale = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const locale = value.trim().toLowerCase();
  return locale.length >= 2 && locale.length <= 10 ? locale : undefined;
};

/**
 * Read-only delivery for integrations (docs/PROGRESS.md "งานนอก MVP"). The key
 * names its site, so no host is needed; only published, public documents are
 * visible and a members-only page never leaves the server.
 */
@Controller('v1/public-api')
@UseGuards(RateLimitGuard)
export class PublicApiController {
  constructor(private readonly keys: ApiKeysService) {}

  @Get('pages')
  @RateLimit({ limit: 240, windowMs: 60_000 })
  async pages(@Headers('x-api-key') key: string | undefined, @Query() query: unknown) {
    const identity = await this.keys.authenticate(key);
    return ok(await this.keys.listDocuments(identity, 'page', publicApiListQuerySchema.parse(query)));
  }

  @Get('pages/:slug')
  @RateLimit({ limit: 240, windowMs: 60_000 })
  async page(
    @Headers('x-api-key') key: string | undefined,
    @Param('slug') slug: string,
    @Query('locale') locale: unknown,
  ) {
    const identity = await this.keys.authenticate(key);
    return ok(
      await this.keys.findDocument(identity, 'page', safeSlug(slug), safeLocale(locale)),
    );
  }

  @Get('posts')
  @RateLimit({ limit: 240, windowMs: 60_000 })
  async posts(@Headers('x-api-key') key: string | undefined, @Query() query: unknown) {
    const identity = await this.keys.authenticate(key);
    return ok(await this.keys.listDocuments(identity, 'post', publicApiListQuerySchema.parse(query)));
  }

  @Get('posts/:slug')
  @RateLimit({ limit: 240, windowMs: 60_000 })
  async post(
    @Headers('x-api-key') key: string | undefined,
    @Param('slug') slug: string,
    @Query('locale') locale: unknown,
  ) {
    const identity = await this.keys.authenticate(key);
    return ok(
      await this.keys.findDocument(identity, 'post', safeSlug(slug), safeLocale(locale)),
    );
  }
}

import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  PAGEVIEW_COUNTRY_HEADERS,
  PAGEVIEW_IP_HEADERS,
  pageviewBatchInputSchema,
  pageviewInputSchema,
  notFoundReportSchema,
  publicPostListQuerySchema,
} from '@lumio/shared';
import type { Request } from 'express';
import { ok } from '../../common/api-response';
import { EdgeCollectGuard } from '../../common/edge-collect.guard';
import { bearerToken, verifyReaderToken, type ReaderClaim } from '../../common/reader-token';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit.guard';
import { PublicCacheInterceptor } from './public-cache.interceptor';
import { PublicService } from './public.service';
import { PublicTrackingService } from './public-tracking.service';

/** A reader token on a public read; anything malformed is simply anonymous. */
const readerClaim = (authorization: string | undefined): ReaderClaim | undefined => {
  const token = bearerToken(authorization);
  return token ? (verifyReaderToken(token) ?? undefined) : undefined;
};

const PAGE_CACHE = new PublicCacheInterceptor({
  maxAge: 60,
  sMaxAge: 300,
  staleWhileRevalidate: 600,
});

/** A slug never reaches the database unbounded. */
const safeSlug = (slug: string): string => slug.slice(0, 200);

/** A locale query value, lowercased and bounded, or `undefined` when absent. */
const safeLocale = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const locale = value.trim().toLowerCase();
  return locale.length >= 2 && locale.length <= 10 ? locale : undefined;
};

/** A header value as a plain string, or `null` when it is missing or repeated. */
const headerString = (value: string | string[] | undefined): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

/** First non-empty header from a list, so any CDN convention works. */
const firstHeader = (request: Request, names: readonly string[]): string | null => {
  for (const name of names) {
    const value = headerString(request.headers[name]);
    if (value) return value;
  }
  return null;
};

/**
 * Context for a beacon. `request.ip` already honours the configured trusted
 * proxy; the headers cover a CDN that runs in front of it without being listed.
 */
const trackingContext = (request: Request) => {
  const forwarded = firstHeader(request, PAGEVIEW_IP_HEADERS);
  return {
    ip: request.ip ?? forwarded,
    userAgent: headerString(request.headers['user-agent']),
    country: firstHeader(request, PAGEVIEW_COUNTRY_HEADERS),
  };
};

/**
 * Anonymous read-only delivery for the public renderer. No auth guard on
 * purpose, but every response is rate limited and cached, and site scoping is
 * still enforced by RLS through {@link PublicService}.
 */
@Controller('v1/public/:host')
@UseGuards(RateLimitGuard)
export class PublicController {
  constructor(
    private readonly publicContent: PublicService,
    private readonly tracking: PublicTrackingService,
  ) {}

  @Get('pages/:slug')
  @RateLimit({ limit: 600, windowMs: 60_000 })
  @UseInterceptors(PAGE_CACHE)
  async page(
    @Param('host') host: string,
    @Param('slug') slug: string,
    @Query('locale') locale: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    return ok(
      await this.publicContent.getPage(
        host,
        safeSlug(slug),
        safeLocale(locale),
        readerClaim(authorization),
      ),
    );
  }

  /**
   * Languages this host offers, so the renderer can honour `Accept-Language`
   * without sending a visitor to a language the site does not have
   * (docs/design/17-i18n.md 17.1).
   */
  @Get('locales')
  @RateLimit({ limit: 240, windowMs: 60_000 })
  @UseInterceptors(PAGE_CACHE)
  async locales(@Param('host') host: string) {
    return ok(await this.publicContent.locales(host));
  }

  @Get('promotions')
  @RateLimit({ limit: 300, windowMs: 60_000 })
  @UseInterceptors(PAGE_CACHE)
  async promotions(@Param('host') host: string) {
    return ok(await this.publicContent.promotions(host));
  }

  @Get('posts')
  @RateLimit({ limit: 300, windowMs: 60_000 })
  @UseInterceptors(PAGE_CACHE)
  async posts(@Param('host') host: string, @Query() query: unknown) {
    const { limit } = publicPostListQuerySchema.parse(query);
    return ok(await this.publicContent.listPosts(host, limit, safeLocale((query as Record<string, unknown>).locale)));
  }

  @Get('posts/:slug')
  @RateLimit({ limit: 600, windowMs: 60_000 })
  @UseInterceptors(PAGE_CACHE)
  async post(
    @Param('host') host: string,
    @Param('slug') slug: string,
    @Query('locale') locale: unknown,
    @Headers('authorization') authorization?: string,
  ) {
    return ok(
      await this.publicContent.getPost(
        host,
        safeSlug(slug),
        safeLocale(locale),
        readerClaim(authorization),
      ),
    );
  }

  @Get('sitemap')
  @RateLimit({ limit: 120, windowMs: 60_000 })
  @UseInterceptors(PAGE_CACHE)
  async sitemap(@Param('host') host: string) {
    return ok(await this.publicContent.sitemap(host));
  }

  /**
   * Page-view beacon (docs/design/05-admin-ia.md "เติบโต › Analytics"). Anonymous
   * and rate limited; the row never carries a full IP, only a rotating hash.
   */
  /**
   * A visible 404 reported by the renderer, so the SEO screen can suggest a
   * redirect (docs/design/14-seo-performance.md 14.1). Fire-and-forget from the
   * renderer; failures never block the page.
   */
  @Post('not-found')
  @RateLimit({ limit: 120, windowMs: 60_000 })
  async notFound(@Param('host') host: string, @Body() body: unknown) {
    const input = notFoundReportSchema.parse(body);
    await this.publicContent.recordNotFound(host, input.path);
    return ok({ success: true });
  }

  @Post('collect')
  @RateLimit({ limit: 240, windowMs: 60_000 })
  async collect(@Param('host') host: string, @Body() body: unknown, @Req() request: Request) {
    const input = pageviewInputSchema.parse(body);
    await this.tracking.record(host, input, trackingContext(request));
    return ok({ success: true });
  }

  /**
   * Batched beacons from a CDN edge or worker (docs/design/14-seo-performance.md).
   * A static site served straight from the CDN has no renderer to relay through,
   * so the edge posts what it served; the shared token keeps the endpoint from
   * being a public way to inflate another site's analytics.
   */
  @Post('collect/batch')
  @UseGuards(RateLimitGuard, EdgeCollectGuard)
  @RateLimit({ limit: 120, windowMs: 60_000 })
  async collectBatch(
    @Param('host') host: string,
    @Body() body: unknown,
    @Req() request: Request,
  ) {
    const { events } = pageviewBatchInputSchema.parse(body);
    const accepted = await this.tracking.recordMany(host, events, trackingContext(request));
    return ok({ success: true, accepted });
  }
}

import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  membershipCheckoutInputSchema,
  readerForgotPasswordInputSchema,
  readerLoginInputSchema,
  readerRegisterInputSchema,
  readerResetPasswordInputSchema,
  readerVerifyEmailInputSchema,
} from '@lumio/shared';
import { ok } from '../../common/api-response';
import { ApiException } from '../../common/api-error';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit.guard';
import { bearerToken, verifyReaderToken } from '../../common/reader-token';
import { PublicCacheInterceptor } from '../public/public-cache.interceptor';
import { resolveSiteByHost } from '../public/resolve-site';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipService } from './membership.service';
import { ReaderService } from './reader.service';

const PLANS_CACHE = new PublicCacheInterceptor({
  maxAge: 60,
  sMaxAge: 300,
  staleWhileRevalidate: 600,
});

/**
 * The visitor's side of membership (docs/PROGRESS.md batch A): join, sign in,
 * recover a password and start a subscription. Every answer is `no-store`
 * except the plan list, and a reader token only ever names its own reader.
 */
@Controller('v1/public/:host/membership')
@UseGuards(RateLimitGuard)
export class ReaderPublicController {
  constructor(
    private readonly readers: ReaderService,
    private readonly membership: MembershipService,
    private readonly db: PrismaService,
  ) {}

  @Get('plans')
  @RateLimit({ limit: 300, windowMs: 60_000 })
  @UseInterceptors(PLANS_CACHE)
  async plans(@Param('host') host: string) {
    const site = await resolveSiteByHost(this.db, host);
    return ok({ items: await this.membership.publicPlans(site.id) });
  }

  @Post('readers')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  @Header('cache-control', 'no-store')
  async register(@Param('host') host: string, @Body() body: unknown) {
    const input = readerRegisterInputSchema.parse(body);
    const site = await resolveSiteByHost(this.db, host);
    return ok(await this.readers.register(site.id, input));
  }

  @Post('readers/login')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  @Header('cache-control', 'no-store')
  async login(@Param('host') host: string, @Body() body: unknown) {
    const input = readerLoginInputSchema.parse(body);
    const site = await resolveSiteByHost(this.db, host);
    return ok(await this.readers.login(site.id, input));
  }

  /** Always the same answer, so an address cannot be probed for an account. */
  @Post('readers/forgot')
  @RateLimit({ limit: 5, windowMs: 60_000 })
  @Header('cache-control', 'no-store')
  async forgot(@Param('host') host: string, @Body() body: unknown) {
    const input = readerForgotPasswordInputSchema.parse(body);
    const site = await resolveSiteByHost(this.db, host);
    await this.readers.forgotPassword(site.id, input);
    return ok({ sent: true });
  }

  @Post('readers/reset')
  @RateLimit({ limit: 5, windowMs: 60_000 })
  @Header('cache-control', 'no-store')
  async reset(@Param('host') host: string, @Body() body: unknown) {
    const input = readerResetPasswordInputSchema.parse(body);
    const site = await resolveSiteByHost(this.db, host);
    await this.readers.resetPassword(site.id, input);
    return ok({ reset: true });
  }

  @Post('readers/verify')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  @Header('cache-control', 'no-store')
  async verify(@Param('host') host: string, @Body() body: unknown) {
    const input = readerVerifyEmailInputSchema.parse(body);
    const site = await resolveSiteByHost(this.db, host);
    return ok(await this.readers.verifyEmail(site.id, input.token));
  }

  @Get('readers/me')
  @RateLimit({ limit: 120, windowMs: 60_000 })
  @Header('cache-control', 'no-store')
  async me(@Param('host') host: string, @Headers('authorization') authorization?: string) {
    const { siteId, readerId } = await this.claim(host, authorization);
    return ok(await this.readers.profile(siteId, readerId));
  }

  /** A free plan is granted at once; a paid one returns the Stripe page to open. */
  @Post('checkout')
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Header('cache-control', 'no-store')
  async checkout(
    @Param('host') host: string,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ) {
    const input = membershipCheckoutInputSchema.parse(body);
    const { siteId, readerId } = await this.claim(host, authorization);
    return ok(await this.readers.checkout(siteId, readerId, input.planId));
  }

  /** Verifies the token against the host, so a token cannot hop between sites. */
  private async claim(
    host: string,
    authorization: string | undefined,
  ): Promise<{ siteId: string; readerId: string }> {
    const token = bearerToken(authorization);
    const claim = token ? verifyReaderToken(token) : null;
    if (!claim) throw ApiException.unauthorized('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');

    const site = await resolveSiteByHost(this.db, host);
    if (site.id !== claim.siteId) {
      throw ApiException.unauthorized('เซสชันนี้ไม่ใช่ของเว็บนี้');
    }
    return { siteId: site.id, readerId: claim.readerId };
  }
}

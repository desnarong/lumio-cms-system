import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import {
  disableTwoFactorInputSchema,
  enableTwoFactorInputSchema,
  loginInputSchema,
  registerInputSchema,
  verifyTwoFactorInputSchema,
} from '@lumio/shared';
import type { Request, Response } from 'express';
import { ok } from '../../common/api-response';
import { ApiException } from '../../common/api-error';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit.guard';
import { getAuthConfig, type AuthConfig } from './auth.config';
import { AuthGuard, type AuthenticatedUser } from './auth.guard';
import { AuthService, type AuthenticatedSession } from './auth.service';
import { readCookie } from './cookie.util';
import { CurrentUser } from './current-user.decorator';

const AUTH_RATE_LIMIT = { limit: 10, windowMs: 60_000 };
const REFRESH_COOKIE_PATH = '/api/v1/auth';

@Controller('v1/auth')
export class AuthController {
  private readonly config: AuthConfig = getAuthConfig();

  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @UseGuards(RateLimitGuard)
  @RateLimit(AUTH_RATE_LIMIT)
  async register(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const session = await this.auth.register(registerInputSchema.parse(body));
    return this.respondWithSession(response, session);
  }

  @Post('login')
  @UseGuards(RateLimitGuard)
  @RateLimit(AUTH_RATE_LIMIT)
  async login(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(loginInputSchema.parse(body));
    if ('challengeToken' in result) return ok(result);
    return this.respondWithSession(response, result);
  }

  /**
   * Second step of sign-in (docs/design/15-security.md). Public like login, but
   * the challenge ticket proves the password step already passed.
   */
  @Post('2fa/verify')
  @UseGuards(RateLimitGuard)
  @RateLimit(AUTH_RATE_LIMIT)
  async verifyTwoFactor(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const session = await this.auth.verifyTwoFactor(verifyTwoFactorInputSchema.parse(body));
    return this.respondWithSession(response, session);
  }

  @Get('2fa')
  @UseGuards(AuthGuard)
  async twoFactorStatus(@CurrentUser() user: AuthenticatedUser) {
    return ok(await this.auth.twoFactorStatus(user.id));
  }

  @Post('2fa/setup')
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 10, windowMs: 60_000 })
  async setupTwoFactor(@CurrentUser() user: AuthenticatedUser) {
    return ok(await this.auth.startTwoFactor(user.id));
  }

  @Post('2fa/enable')
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 10, windowMs: 60_000 })
  async enableTwoFactor(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const { code } = enableTwoFactorInputSchema.parse(body);
    return ok(await this.auth.enableTwoFactor(user.id, code));
  }

  @Post('2fa/disable')
  @UseGuards(AuthGuard)
  @RateLimit({ limit: 10, windowMs: 60_000 })
  async disableTwoFactor(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const input = disableTwoFactorInputSchema.parse(body);
    return ok(await this.auth.disableTwoFactor(user.id, input));
  }

  @Post('refresh')
  @UseGuards(RateLimitGuard)
  @RateLimit(AUTH_RATE_LIMIT)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const token = readCookie(request, this.config.refreshCookieName);
    if (!token) throw ApiException.unauthorized('ไม่พบเซสชัน กรุณาเข้าสู่ระบบใหม่');
    const session = await this.auth.refresh(token);
    return this.respondWithSession(response, session);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(this.config.refreshCookieName, { path: REFRESH_COOKIE_PATH });
    return ok({ success: true });
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@CurrentUser() user: AuthenticatedUser) {
    return ok(await this.auth.me(user.id));
  }

  private respondWithSession(response: Response, session: AuthenticatedSession) {
    response.cookie(this.config.refreshCookieName, session.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
      maxAge: this.config.refreshCookieMaxAgeMs,
    });
    return ok({ user: session.user, accessToken: session.accessToken });
  }
}

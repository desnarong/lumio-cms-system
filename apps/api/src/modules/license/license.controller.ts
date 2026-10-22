import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  verifyLicenseInputSchema,
  type Role,
  type VerifyLicenseInput,
} from '@lumio/shared';
import { ok } from '../../common/api-response';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit.guard';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { LicenseService } from './license.service';

const READ_ROLES: Role[] = ['owner', 'admin', 'editor', 'author', 'viewer'];

/** What this deployment is licensed to run; no token is ever returned. */
@Controller('v1/license')
@UseGuards(AuthGuard, SiteGuard, RolesGuard)
export class LicenseController {
  constructor(private readonly license: LicenseService) {}

  @Get()
  @Roles(...READ_ROLES)
  async status() {
    return ok(this.license.status());
  }
}

/**
 * Public signature check (docs/design/24-community-licensing.md). It answers
 * only "is this token genuine and still valid", so an operator can test a
 * licence before installing it. Nothing is stored and no secret is involved.
 */
@Controller('v1/public/license')
@UseGuards(RateLimitGuard)
export class PublicLicenseController {
  constructor(private readonly license: LicenseService) {}

  @Post('verify')
  @RateLimit({ limit: 60, windowMs: 60_000 })
  async verify(@Body() body: unknown) {
    const input: VerifyLicenseInput = verifyLicenseInputSchema.parse(body);
    return ok(this.license.verifyToken(input.token));
  }
}

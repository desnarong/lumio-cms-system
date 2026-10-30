import { Body, Controller, Delete, Get, Patch, Post, UseGuards } from '@nestjs/common';
import {
  installLicenseInputSchema,
  verifyLicenseInputSchema,
  type InstallLicenseInput,
  type Role,
  type VerifyLicenseInput,
} from '@lumio/shared';
import { ok } from '../../common/api-response';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit.guard';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { LicenseService } from './license.service';
import { LicenseStore } from './license.store';

const READ_ROLES: Role[] = ['owner', 'admin', 'editor', 'author', 'viewer'];
const MANAGE_ROLES: Role[] = ['owner', 'admin'];
/** The licence belongs to the installation, so only an owner may swap it. */
const INSTALL_ROLES: Role[] = ['owner'];

/** What this deployment is licensed to run; no token is ever returned. */
@Controller('v1/license')
@UseGuards(AuthGuard, SiteGuard, RolesGuard)
export class LicenseController {
  constructor(
    private readonly license: LicenseService,
    private readonly store: LicenseStore,
  ) {}

  @Get()
  @Roles(...READ_ROLES)
  async status() {
    return ok(this.store.view());
  }

  /**
   * Install a licence pasted into ตั้งค่า › ไลเซนส์
   * (docs/design/24-community-licensing.md 24.10), so the owner never edits
   * `.env`. The token is verified before it is stored and never returned.
   */
  @Patch()
  @Roles(...INSTALL_ROLES)
  async install(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input: InstallLicenseInput = installLicenseInputSchema.parse(body);
    return ok(await this.store.install(input, user.id, siteId));
  }

  /** Removes the stored licence and returns to Community; undo by re-installing. */
  @Delete()
  @Roles(...INSTALL_ROLES)
  async remove(@CurrentSite() siteId: string, @CurrentUser() user: AuthenticatedUser) {
    return ok(await this.store.remove(user.id, siteId));
  }

  /**
   * Renew an online licence lease now (docs/design/24-community-licensing.md
   * 24.9). An offline licence has nothing to renew, so this answers with the
   * current status. The API also renews on a timer; the button exists because an
   * operator who just fixed their network should not have to wait hours.
   */
  @Post('refresh')
  @Roles(...MANAGE_ROLES)
  async refresh() {
    return ok(await this.license.refresh());
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

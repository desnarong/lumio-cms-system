import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  marketplaceInstallSchema,
  marketplacePackToggleSchema,
  marketplaceTokenInputSchema,
  type ApiLocale,
  type Role,
} from '@lumio/shared';
import { ok } from '../../common/api-response';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit.guard';
import { RequestLocale } from '../../common/request-locale.decorator';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { FeatureGuard, RequireFeature } from '../features/feature.guard';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { MarketplaceService } from './marketplace.service';

const READ_ROLES: Role[] = ['owner', 'admin', 'editor', 'author', 'viewer'];
/** Installing a pack adds sections to the editor, so it stays with owners/admins. */
const MANAGE_ROLES: Role[] = ['owner', 'admin'];

/**
 * The block marketplace (docs/PROGRESS.md "ก้อนถัดไป B"). A paid capability, so
 * the whole controller sits behind `marketplace` in the feature flags: without a
 * licence that lists it, even reading the catalogue is refused.
 */
@Controller('v1/marketplace')
@UseGuards(AuthGuard, SiteGuard, RolesGuard, FeatureGuard)
@RequireFeature('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  /** The official catalogue plus every pack this site installed. */
  @Get()
  @Roles(...READ_ROLES)
  async view(@CurrentSite() siteId: string) {
    return ok(await this.marketplace.view(siteId));
  }

  /** Sections of the enabled packs, read by the editor's section library. */
  @Get('sections')
  @Roles(...READ_ROLES)
  async sections(@CurrentSite() siteId: string, @RequestLocale() locale: ApiLocale) {
    return ok(await this.marketplace.sections(siteId, locale));
  }

  /** Checks a signed pack before it is installed; nothing is stored. */
  @Post('preview')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 20, windowMs: 60_000 })
  @Roles(...MANAGE_ROLES)
  async preview(@Body() body: unknown) {
    const { token } = marketplaceTokenInputSchema.parse(body);
    return ok(await this.marketplace.verify(token));
  }

  /** Installs an official pack by key or a signed vendor pack; upgrades in place. */
  @Post('installs')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowMs: 60_000 })
  @Roles(...MANAGE_ROLES)
  async install(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = marketplaceInstallSchema.parse(body);
    return ok(await this.marketplace.install(siteId, input, user.id));
  }

  @Patch('installs/:packKey')
  @Roles(...MANAGE_ROLES)
  async toggle(
    @CurrentSite() siteId: string,
    @Param('packKey') packKey: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = marketplacePackToggleSchema.parse(body);
    return ok(await this.marketplace.setEnabled(siteId, packKey, input.enabled, user.id));
  }

  @Delete('installs/:packKey')
  @Roles(...MANAGE_ROLES)
  async remove(
    @CurrentSite() siteId: string,
    @Param('packKey') packKey: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.marketplace.remove(siteId, packKey, user.id);
    return ok({ success: true });
  }
}

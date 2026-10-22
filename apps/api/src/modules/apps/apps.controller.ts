import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  appBridgeRequestSchema,
  externalAppInputSchema,
  installAppInputSchema,
  updateInstalledAppInputSchema,
  type ApiLocale,
  type Role,
} from '@lumio/shared';
import { ok } from '../../common/api-response';
import { RequestLocale } from '../../common/request-locale.decorator';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { FeatureGuard, RequireFeature } from '../features/feature.guard';
import { AppBridgeService } from './app-bridge.service';
import { AppManifestService } from './app-manifest.service';
import { AppsService } from './apps.service';

const READ_ROLES: Role[] = ['owner', 'admin', 'editor', 'author', 'viewer'];
/** Installing an App changes what may read site data, so it stays with owners/admins. */
const MANAGE_ROLES: Role[] = ['owner', 'admin'];

/** App store and installed Apps (docs/design/05-admin-ia.md "เติบโต › Apps"). */
@Controller('v1')
@UseGuards(AuthGuard, SiteGuard, RolesGuard, FeatureGuard)
@RequireFeature('apps')
export class AppsController {
  constructor(
    private readonly apps: AppsService,
    private readonly bridge: AppBridgeService,
    private readonly manifests: AppManifestService,
  ) {}

  @Get('apps')
  @Roles(...READ_ROLES)
  async store(@CurrentSite() siteId: string, @RequestLocale() locale: ApiLocale) {
    return ok(await this.apps.store(siteId, locale));
  }

  @Get('site-apps')
  @Roles(...READ_ROLES)
  async installed(@CurrentSite() siteId: string, @RequestLocale() locale: ApiLocale) {
    return ok(await this.apps.listInstalled(siteId, locale));
  }

  /**
   * Validates a developer-hosted manifest before the owner installs it, so the
   * permission list shown by the store is the one the API would enforce.
   */
  @Post('apps/external/preview')
  @Roles(...MANAGE_ROLES)
  async previewExternal(@Body() body: unknown) {
    const { url } = externalAppInputSchema.parse(body);
    return ok(await this.manifests.preview(url));
  }

  /** Installs an App from a manifest URL; the API fetches it again itself. */
  @Post('apps/external')
  @Roles(...MANAGE_ROLES)
  async installExternal(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
    @RequestLocale() locale: ApiLocale,
  ) {
    return ok(await this.apps.installExternal(siteId, body, user.id, locale));
  }

  @Post('site-apps/:appKey')
  @Roles(...MANAGE_ROLES)
  async install(
    @CurrentSite() siteId: string,
    @Param('appKey') appKey: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
    @RequestLocale() locale: ApiLocale,
  ) {
    const input = installAppInputSchema.parse(body);
    return ok(await this.apps.install(siteId, appKey, input, user.id, locale));
  }

  @Patch('site-apps/:appKey')
  @Roles(...MANAGE_ROLES)
  async update(
    @CurrentSite() siteId: string,
    @Param('appKey') appKey: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
    @RequestLocale() locale: ApiLocale,
  ) {
    const input = updateInstalledAppInputSchema.parse(body);
    return ok(await this.apps.update(siteId, appKey, input, user.id, locale));
  }

  @Delete('site-apps/:appKey')
  @Roles(...MANAGE_ROLES)
  async remove(
    @CurrentSite() siteId: string,
    @Param('appKey') appKey: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.apps.remove(siteId, appKey, user.id);
    return ok({ success: true });
  }

  /**
   * The only door an App's sandbox has into site data (docs/design/16-apps.md 16.4).
   * The bridge checks the App's scope before running anything.
   */
  @Post('site-apps/:appKey/bridge')
  @Roles(...READ_ROLES)
  async callBridge(
    @CurrentSite() siteId: string,
    @Param('appKey') appKey: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const request = appBridgeRequestSchema.parse(body);
    return ok(await this.bridge.call(siteId, appKey, request, user.id));
  }
}

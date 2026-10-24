import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  applyTemplateInputSchema,
  siteChromePatchSchema,
  themeTokensPatchSchema,
  type Role,
} from '@lumio/shared';
import { ok } from '../../common/api-response';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { DesignService } from './design.service';

/** Design panel and template switching; needs `design.update` (13-rbac.md). */
const READ_ROLES: Role[] = ['owner', 'admin', 'editor', 'author', 'viewer'];
const DESIGN_ROLES: Role[] = ['owner', 'admin', 'editor'];

@Controller('v1/design')
@UseGuards(AuthGuard, SiteGuard, RolesGuard)
export class DesignController {
  constructor(private readonly design: DesignService) {}

  @Get('chrome')
  @Roles(...READ_ROLES)
  async getChrome(@CurrentSite() siteId: string) {
    return ok(await this.design.getChrome(siteId));
  }

  @Patch('chrome')
  @Roles(...DESIGN_ROLES)
  async updateChrome(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const patch = siteChromePatchSchema.parse(body);
    return ok(await this.design.updateChrome(siteId, patch, user.id));
  }

  @Get('tokens')
  @Roles(...READ_ROLES)
  async getTokens(@CurrentSite() siteId: string) {
    return ok(await this.design.getTokens(siteId));
  }

  @Patch('tokens')
  @Roles(...DESIGN_ROLES)
  async updateTokens(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const patch = themeTokensPatchSchema.parse(body);
    return ok(await this.design.updateTokens(siteId, patch, user.id));
  }

  @Post('tokens/reset')
  @Roles(...DESIGN_ROLES)
  async resetTokens(@CurrentSite() siteId: string, @CurrentUser() user: AuthenticatedUser) {
    return ok(await this.design.resetTokens(siteId, user.id));
  }

  @Post('template/:templateId/apply')
  @Roles(...DESIGN_ROLES)
  async applyTemplate(
    @CurrentSite() siteId: string,
    @Param('templateId') templateId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = applyTemplateInputSchema.parse(body ?? {});
    return ok(await this.design.applyTemplate(siteId, templateId, input, user.id));
  }
}
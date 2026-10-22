import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { menuLocationSchema, updateMenuInputSchema, type Role } from '@lumio/shared';
import { ok } from '../../common/api-response';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { MenusService } from './menus.service';

const READ_ROLES: Role[] = ['owner', 'admin', 'editor', 'author', 'viewer'];
const DESIGN_ROLES: Role[] = ['owner', 'admin', 'editor'];

/** A `?locale=` value, lowercased and bounded, or `undefined` when absent. */
const safeLocale = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const locale = value.trim().toLowerCase();
  return locale.length >= 2 && locale.length <= 10 ? locale : undefined;
};

/**
 * Menus are read and written per language: `?locale=en` reads the English menu,
 * and omitting it reads the menu shared by every language
 * (docs/design/17-i18n.md 17.5).
 */
@Controller('v1/menus')
@UseGuards(AuthGuard, SiteGuard, RolesGuard)
export class MenusController {
  constructor(private readonly menus: MenusService) {}

  @Get(':location')
  @Roles(...READ_ROLES)
  async get(
    @CurrentSite() siteId: string,
    @Param('location') location: string,
    @Query('locale') locale: unknown,
  ) {
    return ok(await this.menus.get(siteId, menuLocationSchema.parse(location), safeLocale(locale)));
  }

  @Put(':location')
  @Roles(...DESIGN_ROLES)
  async update(
    @CurrentSite() siteId: string,
    @Param('location') location: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = updateMenuInputSchema.parse(body);
    return ok(await this.menus.update(siteId, menuLocationSchema.parse(location), input, user.id));
  }
}
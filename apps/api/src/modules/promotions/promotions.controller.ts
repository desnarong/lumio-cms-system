import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { promotionInputSchema, type Role } from '@lumio/shared';
import { ok } from '../../common/api-response';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { PromotionsService } from './promotions.service';

const READ_ROLES: Role[] = ['owner', 'admin', 'editor', 'author', 'viewer'];
const WRITE_ROLES: Role[] = ['owner', 'admin', 'editor'];

/** Offer campaigns of the current site (docs/design/12-api.md 12.6). */
@Controller('v1/promotions')
@UseGuards(AuthGuard, SiteGuard, RolesGuard)
export class PromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  @Get()
  @Roles(...READ_ROLES)
  async list(@CurrentSite() siteId: string) {
    return ok(await this.promotions.list(siteId));
  }

  @Post()
  @Roles(...WRITE_ROLES)
  async create(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = promotionInputSchema.parse(body);
    return ok(await this.promotions.create(siteId, input, user.id));
  }

  @Patch(':promotionId')
  @Roles(...WRITE_ROLES)
  async update(
    @CurrentSite() siteId: string,
    @Param('promotionId') promotionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = promotionInputSchema.partial().parse(body);
    return ok(await this.promotions.update(siteId, promotionId, input, user.id));
  }

  @Delete(':promotionId')
  @Roles(...WRITE_ROLES)
  async remove(
    @CurrentSite() siteId: string,
    @Param('promotionId') promotionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.promotions.remove(siteId, promotionId, user.id);
    return ok({ success: true });
  }
}

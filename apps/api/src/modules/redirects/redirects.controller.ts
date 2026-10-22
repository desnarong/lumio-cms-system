import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  createRedirectInputSchema,
  updateRedirectInputSchema,
  type Role,
} from '@lumio/shared';
import { ok } from '../../common/api-response';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { RedirectsService } from './redirects.service';

const READ_ROLES: Role[] = ['owner', 'admin', 'editor', 'author', 'viewer'];
const MANAGE_ROLES: Role[] = ['owner', 'admin', 'editor'];

/** Old addresses for one site (14-seo-performance.md 14.1). */
@Controller('v1/redirects')
@UseGuards(AuthGuard, SiteGuard, RolesGuard)
export class RedirectsController {
  constructor(private readonly redirects: RedirectsService) {}

  @Get()
  @Roles(...READ_ROLES)
  async list(@CurrentSite() siteId: string) {
    return ok(await this.redirects.list(siteId));
  }

  @Post()
  @Roles(...MANAGE_ROLES)
  async create(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = createRedirectInputSchema.parse(body);
    return ok(await this.redirects.create(siteId, input, user.id));
  }

  @Patch()
  @Roles(...MANAGE_ROLES)
  async update(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = updateRedirectInputSchema.parse(body);
    return ok(await this.redirects.update(siteId, input, user.id));
  }

  @Delete()
  @Roles(...MANAGE_ROLES)
  async remove(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') fromPath?: string,
  ) {
    await this.redirects.remove(siteId, fromPath, user.id);
    return ok({ success: true });
  }
}

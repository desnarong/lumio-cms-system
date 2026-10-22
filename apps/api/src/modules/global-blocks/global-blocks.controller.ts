import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import {
  globalBlockKindSchema,
  updateGlobalBlockInputSchema,
  type Role,
} from '@lumio/shared';
import { ok } from '../../common/api-response';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { GlobalBlocksService } from './global-blocks.service';

const READ_ROLES: Role[] = ['owner', 'admin', 'editor', 'author', 'viewer'];
const DESIGN_ROLES: Role[] = ['owner', 'admin', 'editor'];

/** Header/footer global blocks (05-admin-ia.md 5.1 "Header / Footer"). */
@Controller('v1/global-blocks')
@UseGuards(AuthGuard, SiteGuard, RolesGuard)
export class GlobalBlocksController {
  constructor(private readonly globalBlocks: GlobalBlocksService) {}

  @Get()
  @Roles(...READ_ROLES)
  async get(@CurrentSite() siteId: string) {
    return ok(await this.globalBlocks.get(siteId));
  }

  @Put(':kind')
  @Roles(...DESIGN_ROLES)
  async update(
    @CurrentSite() siteId: string,
    @Param('kind') kind: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = updateGlobalBlockInputSchema.parse(body);
    return ok(
      await this.globalBlocks.update(siteId, globalBlockKindSchema.parse(kind), input, user.id),
    );
  }
}

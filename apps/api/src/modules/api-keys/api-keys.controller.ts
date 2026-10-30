import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { apiKeyInputSchema, type Role } from '@lumio/shared';
import { ok } from '../../common/api-response';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { ApiKeysService } from './api-keys.service';

const READ_ROLES: Role[] = ['owner', 'admin', 'editor', 'author', 'viewer'];
/** Creating a key hands out data access, so it stays with owners and admins. */
const WRITE_ROLES: Role[] = ['owner', 'admin'];

/** Keys of the current site (docs/PROGRESS.md "งานนอก MVP"). */
@Controller('v1/api-keys')
@UseGuards(AuthGuard, SiteGuard, RolesGuard)
export class ApiKeysController {
  constructor(private readonly keys: ApiKeysService) {}

  @Get()
  @Roles(...READ_ROLES)
  async list(@CurrentSite() siteId: string) {
    return ok(await this.keys.list(siteId));
  }

  @Post()
  @Roles(...WRITE_ROLES)
  async create(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = apiKeyInputSchema.parse(body);
    return ok(await this.keys.create(siteId, input, user.id));
  }

  @Delete(':keyId')
  @Roles(...WRITE_ROLES)
  async revoke(
    @CurrentSite() siteId: string,
    @Param('keyId') keyId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return ok(await this.keys.revoke(siteId, keyId, user.id));
  }
}

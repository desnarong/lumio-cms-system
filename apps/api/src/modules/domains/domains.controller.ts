import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { addDomainInputSchema, type Role } from '@lumio/shared';
import { ok } from '../../common/api-response';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { DomainsService } from './domains.service';

const READ_ROLES: Role[] = ['owner', 'admin', 'editor', 'author', 'viewer'];
const MANAGE_ROLES: Role[] = ['owner', 'admin'];

/** Custom domains for one site (05-admin-ia.md 5.1 "ตั้งค่า > ทั่วไป / โดเมน"). */
@Controller('v1/sites/:id/domains')
@UseGuards(AuthGuard, SiteGuard, RolesGuard)
export class DomainsController {
  constructor(private readonly domains: DomainsService) {}

  @Get()
  @Roles(...READ_ROLES)
  async list(@CurrentSite() siteId: string) {
    return ok(await this.domains.list(siteId));
  }

  @Post()
  @Roles(...MANAGE_ROLES)
  async add(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = addDomainInputSchema.parse(body);
    return ok(await this.domains.add(siteId, input, user.id));
  }

  @Post(':domainId/verify')
  @Roles(...MANAGE_ROLES)
  async verify(
    @CurrentSite() siteId: string,
    @Param('domainId') domainId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return ok(await this.domains.verify(siteId, domainId, user.id));
  }

  @Delete(':domainId')
  @Roles(...MANAGE_ROLES)
  async remove(
    @CurrentSite() siteId: string,
    @Param('domainId') domainId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.domains.remove(siteId, domainId, user.id);
    return ok({ success: true });
  }
}

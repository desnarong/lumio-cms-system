import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { agencyBrandingInputSchema, type Role } from '@lumio/shared';
import { ok } from '../../common/api-response';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { AgencyService } from './agency.service';

const READ_ROLES: Role[] = ['owner', 'admin'];
/** Branding is a platform-wide change, so only an owner may make it. */
const WRITE_ROLES: Role[] = ['owner'];

/** White-label branding of this installation (docs/PROGRESS.md "งานนอก MVP"). */
@Controller('v1/agency')
@UseGuards(AuthGuard, SiteGuard, RolesGuard)
export class AgencyController {
  constructor(private readonly agency: AgencyService) {}

  @Get()
  @Roles(...READ_ROLES)
  async get() {
    return ok(await this.agency.get());
  }

  @Patch()
  @Roles(...WRITE_ROLES)
  async update(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = agencyBrandingInputSchema.parse(body);
    return ok(await this.agency.update(input, user.id, siteId));
  }
}

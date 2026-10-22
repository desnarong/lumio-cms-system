import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { updateChecklistInputSchema, type ApiLocale, type Role } from '@lumio/shared';
import { ok } from '../../common/api-response';
import { RequestLocale } from '../../common/request-locale.decorator';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { DashboardService } from './dashboard.service';

const READ_ROLES: Role[] = ['owner', 'admin', 'editor', 'author', 'viewer'];
const WRITE_ROLES: Role[] = ['owner', 'admin', 'editor'];

/** Dashboard summary and the onboarding checklist (05-admin-ia.md 5.2). */
@Controller('v1/dashboard')
@UseGuards(AuthGuard, SiteGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @Roles(...READ_ROLES)
  async summary(@CurrentSite() siteId: string, @RequestLocale() locale: ApiLocale) {
    return ok(await this.dashboard.summary(siteId, locale));
  }

  @Patch('checklist')
  @Roles(...WRITE_ROLES)
  async updateChecklist(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = updateChecklistInputSchema.parse(body);
    return ok(await this.dashboard.updateChecklist(siteId, input, user.id));
  }
}

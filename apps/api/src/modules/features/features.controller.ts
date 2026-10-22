import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { updateFeatureFlagsInputSchema, type Role } from '@lumio/shared';
import { ok } from '../../common/api-response';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { FeaturesService } from './features.service';

const READ_ROLES: Role[] = ['owner', 'admin', 'editor', 'author', 'viewer'];
/** Closing a capability hides screens from everybody on the site, so it is admin work. */
const WRITE_ROLES: Role[] = ['owner', 'admin'];

/** Which additions a site currently offers (docs/design/03-scope.md 3.6). */
@Controller('v1/features')
@UseGuards(AuthGuard, SiteGuard, RolesGuard)
export class FeaturesController {
  constructor(private readonly features: FeaturesService) {}

  @Get()
  @Roles(...READ_ROLES)
  async list(@CurrentSite() siteId: string) {
    return ok(await this.features.list(siteId));
  }

  @Patch()
  @Roles(...WRITE_ROLES)
  async update(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = updateFeatureFlagsInputSchema.parse(body);
    return ok(await this.features.update(siteId, input, user.id));
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CANCEL_MEMBERSHIP_INPUT,
  membershipPlanInputSchema,
  readerListQuerySchema,
  updateMembershipPlanInputSchema,
  type Role,
} from '@lumio/shared';
import { ok } from '../../common/api-response';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { FeatureGuard, RequireFeature } from '../features/feature.guard';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { MembershipService } from './membership.service';

const READ_ROLES: Role[] = ['owner', 'admin', 'editor', 'author', 'viewer'];
const WRITE_ROLES: Role[] = ['owner', 'admin', 'editor'];

/**
 * Plans, readers and revenue of one site (docs/PROGRESS.md batch A). Selling
 * memberships is a licensed capability, so `FeatureGuard` closes the whole
 * screen until the deployment carries a licence that includes it.
 */
@Controller('v1/membership')
@UseGuards(AuthGuard, SiteGuard, RolesGuard, FeatureGuard)
@RequireFeature('membership')
export class MembershipController {
  constructor(private readonly membership: MembershipService) {}

  @Get('plans')
  @Roles(...READ_ROLES)
  async plans(@CurrentSite() siteId: string) {
    return ok({ items: await this.membership.plans(siteId) });
  }

  @Post('plans')
  @Roles(...WRITE_ROLES)
  async createPlan(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = membershipPlanInputSchema.parse(body);
    return ok(await this.membership.createPlan(siteId, input, user.id));
  }

  @Patch('plans/:id')
  @Roles(...WRITE_ROLES)
  async updatePlan(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = updateMembershipPlanInputSchema.parse(body);
    return ok(await this.membership.updatePlan(siteId, id, input, user.id));
  }

  @Delete('plans/:id')
  @Roles(...WRITE_ROLES)
  async deletePlan(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.membership.deletePlan(siteId, id, user.id);
    return ok({ deleted: true });
  }

  @Get('readers')
  @Roles(...READ_ROLES)
  async readers(@CurrentSite() siteId: string, @Query() query: unknown) {
    const input = readerListQuerySchema.parse(query);
    return ok(await this.membership.readers(siteId, input));
  }

  @Get('summary')
  @Roles(...READ_ROLES)
  async summary(@CurrentSite() siteId: string) {
    return ok(await this.membership.summary(siteId));
  }

  /** Stops the next renewal; the paid period the reader already paid for stays. */
  @Post('readers/:id/cancel')
  @Roles(...WRITE_ROLES)
  async cancel(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = CANCEL_MEMBERSHIP_INPUT.parse(body ?? {});
    return ok(await this.membership.cancelSubscription(siteId, id, input.cancel, user.id));
  }
}

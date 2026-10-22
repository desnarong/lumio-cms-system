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
  createSubscriberInputSchema,
  subscriberListQuerySchema,
  updateSubscriberInputSchema,
  type Role,
} from '@lumio/shared';
import { ok } from '../../common/api-response';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { FeatureGuard, RequireFeature } from '../features/feature.guard';
import { NewsletterService } from './newsletter.service';

const READ_ROLES: Role[] = ['owner', 'admin', 'editor', 'author', 'viewer'];
const WRITE_ROLES: Role[] = ['owner', 'admin', 'editor'];

/** Newsletter subscribers (docs/design/05-admin-ia.md "เติบโต › Newsletter"). */
@Controller('v1/subscribers')
@UseGuards(AuthGuard, SiteGuard, RolesGuard, FeatureGuard)
@RequireFeature('newsletter')
export class NewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Get()
  @Roles(...READ_ROLES)
  async list(@CurrentSite() siteId: string, @Query() query: unknown) {
    const parsed = subscriberListQuerySchema.parse(query);
    const page = await this.newsletter.list(siteId, parsed);
    return ok(
      { items: page.items, total: page.total, activeCount: page.activeCount },
      { cursor: page.cursor },
    );
  }

  @Get('export')
  @Roles(...READ_ROLES)
  async export(@CurrentSite() siteId: string) {
    const content = await this.newsletter.exportCsv(siteId);
    const filename = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    return ok({ filename, content });
  }

  @Post()
  @Roles(...WRITE_ROLES)
  async create(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = createSubscriberInputSchema.parse(body);
    return ok(await this.newsletter.create(siteId, input, user.id));
  }

  @Patch(':subscriberId')
  @Roles(...WRITE_ROLES)
  async update(
    @CurrentSite() siteId: string,
    @Param('subscriberId') subscriberId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = updateSubscriberInputSchema.parse(body);
    return ok(await this.newsletter.update(siteId, subscriberId, input, user.id));
  }

  @Delete(':subscriberId')
  @Roles(...WRITE_ROLES)
  async remove(
    @CurrentSite() siteId: string,
    @Param('subscriberId') subscriberId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.newsletter.remove(siteId, subscriberId, user.id);
    return ok({ success: true });
  }
}

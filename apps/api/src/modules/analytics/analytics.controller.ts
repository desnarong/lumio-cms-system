import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { analyticsQuerySchema, type ApiLocale, type Role } from '@lumio/shared';
import { ok } from '../../common/api-response';
import { RequestLocale } from '../../common/request-locale.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { FeatureGuard, RequireFeature } from '../features/feature.guard';
import { AnalyticsService } from './analytics.service';

const READ_ROLES: Role[] = ['owner', 'admin', 'editor', 'author', 'viewer'];

/** Visitor analytics for the site (docs/design/05-admin-ia.md "เติบโต › Analytics"). */
@Controller('v1/analytics')
@UseGuards(AuthGuard, SiteGuard, RolesGuard, FeatureGuard)
@RequireFeature('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get()
  @Roles(...READ_ROLES)
  async summary(
    @CurrentSite() siteId: string,
    @Query() query: unknown,
    @RequestLocale() locale: ApiLocale,
  ) {
    const { range } = analyticsQuerySchema.parse(query);
    return ok(await this.analytics.summary(siteId, range, locale));
  }
}

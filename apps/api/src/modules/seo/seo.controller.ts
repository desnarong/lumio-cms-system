import { Controller, Get, UseGuards } from '@nestjs/common';
import type { ApiLocale, Role } from '@lumio/shared';
import { ok } from '../../common/api-response';
import { RequestLocale } from '../../common/request-locale.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { SeoService } from './seo.service';

const READ_ROLES: Role[] = ['owner', 'admin', 'editor', 'author', 'viewer'];

/** SEO report for the site (docs/design/05-admin-ia.md "เติบโต › SEO"). */
@Controller('v1/seo')
@UseGuards(AuthGuard, SiteGuard, RolesGuard)
export class SeoController {
  constructor(private readonly seo: SeoService) {}

  @Get('not-found')
  @Roles(...READ_ROLES)
  async notFound(@CurrentSite() siteId: string) {
    return ok(await this.seo.notFound(siteId));
  }

  @Get('health')
  @Roles(...READ_ROLES)
  async health(@CurrentSite() siteId: string, @RequestLocale() locale: ApiLocale) {
    return ok(await this.seo.health(siteId, locale));
  }
}

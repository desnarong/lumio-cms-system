import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  createSiteFromTemplateInputSchema,
  paginationQuerySchema,
  updateSiteInputSchema,
  type Role,
} from '@lumio/shared';
import { ok } from '../../common/api-response';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite, CurrentSiteRole } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { SiteLocaleService } from './site-locale.service';
import { SiteWizardService } from './site-wizard.service';
import { SitesService } from './sites.service';

@Controller('v1/sites')
@UseGuards(AuthGuard)
export class SitesController {
  constructor(
    private readonly sites: SitesService,
    private readonly wizard: SiteWizardService,
    private readonly locales: SiteLocaleService,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser, @Query() query: unknown) {
    const page = paginationQuerySchema.parse(query);
    const { items, cursor } = await this.sites.listForUser(user.id, page);
    return ok(items, { cursor });
  }

  /**
   * Creating a site *is* step 5 of the onboarding wizard, so the same endpoint
   * takes the wizard's answers and builds the sample pages from the template.
   */
  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    const input = createSiteFromTemplateInputSchema.parse(body);
    return ok(await this.wizard.createFromTemplate(user.id, input));
  }

  @Get(':id')
  @UseGuards(SiteGuard, RolesGuard)
  @Roles('owner', 'admin', 'editor', 'author', 'viewer')
  async getOne(@CurrentSite() siteId: string, @CurrentSiteRole() role: Role) {
    return ok(await this.sites.get(siteId, role));
  }

  /** Progress of the background build of the site's other languages. */
  @Get(':id/locales')
  @UseGuards(SiteGuard, RolesGuard)
  @Roles('owner', 'admin', 'editor', 'author', 'viewer')
  async localeStatus(@CurrentSite() siteId: string) {
    return ok(await this.locales.status(siteId));
  }

  @Patch(':id')
  @UseGuards(SiteGuard, RolesGuard)
  @Roles('owner', 'admin')
  async update(
    @CurrentSite() siteId: string,
    @CurrentSiteRole() role: Role,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = updateSiteInputSchema.parse(body);
    return ok(await this.sites.update(siteId, input, user.id, role));
  }

  @Post(':id/publish-all')
  @UseGuards(SiteGuard, RolesGuard)
  @Roles('owner', 'admin', 'editor')
  async publishAll(@CurrentSite() siteId: string, @CurrentUser() user: AuthenticatedUser) {
    return ok(await this.sites.publishAll(siteId, user.id));
  }
}

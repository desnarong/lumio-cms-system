import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  createSectionTemplateInputSchema,
  updateSectionTemplateInputSchema,
  type Role,
} from '@lumio/shared';
import { ok } from '../../common/api-response';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { SectionTemplatesService } from './section-templates.service';

const READ_ROLES: Role[] = ['owner', 'admin', 'editor', 'author', 'viewer'];
const WRITE_ROLES: Role[] = ['owner', 'admin', 'editor', 'author'];

@Controller('v1/section-templates')
@UseGuards(AuthGuard, SiteGuard, RolesGuard)
export class SectionTemplatesController {
  constructor(private readonly sections: SectionTemplatesService) {}

  @Get()
  @Roles(...READ_ROLES)
  async list(@CurrentSite() siteId: string) {
    return ok(await this.sections.list(siteId));
  }

  @Post()
  @Roles(...WRITE_ROLES)
  async create(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = createSectionTemplateInputSchema.parse(body);
    return ok(await this.sections.create(siteId, input, user.id));
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  async rename(
    @CurrentSite() siteId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = updateSectionTemplateInputSchema.parse(body);
    return ok(await this.sections.rename(siteId, id, input, user.id));
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  async remove(
    @CurrentSite() siteId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.sections.remove(siteId, id, user.id);
    return ok({ success: true });
  }
}
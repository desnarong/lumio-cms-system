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
  copyFormToLocaleInputSchema,
  createFormInputSchema,
  submissionListQuerySchema,
  updateFormInputSchema,
  updateSubmissionInputSchema,
  type Role,
} from '@lumio/shared';
import { ok } from '../../common/api-response';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { FormsService } from './forms.service';

/** The site is taken from `X-Site-Id`; `:formId` is never a site id. */
const READ_ROLES: Role[] = ['owner', 'admin', 'editor', 'author', 'viewer'];
const WRITE_ROLES: Role[] = ['owner', 'admin', 'editor'];

/** Contact forms and the messages they collect (05-admin-ia.md "ฟอร์ม"). */
@Controller('v1/forms')
@UseGuards(AuthGuard, SiteGuard, RolesGuard)
export class FormsController {
  constructor(private readonly forms: FormsService) {}

  @Get()
  @Roles(...READ_ROLES)
  async list(@CurrentSite() siteId: string) {
    return ok(await this.forms.list(siteId));
  }

  @Post()
  @Roles(...WRITE_ROLES)
  async create(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = createFormInputSchema.parse(body);
    return ok(await this.forms.create(siteId, input, user.id));
  }

  @Get(':formId')
  @Roles(...READ_ROLES)
  async getOne(@CurrentSite() siteId: string, @Param('formId') formId: string) {
    return ok(await this.forms.get(siteId, formId));
  }

  /**
   * Copies a form into another language (docs/design/17-i18n.md 17.5). Labels
   * come across untouched: the user or the assistant translates them.
   */
  @Post(':formId/locale')
  @Roles(...WRITE_ROLES)
  async copyLocale(
    @CurrentSite() siteId: string,
    @Param('formId') formId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = copyFormToLocaleInputSchema.parse(body);
    return ok(await this.forms.copyToLocale(siteId, formId, input, user.id));
  }

  @Patch(':formId')
  @Roles(...WRITE_ROLES)
  async update(
    @CurrentSite() siteId: string,
    @Param('formId') formId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = updateFormInputSchema.parse(body);
    return ok(await this.forms.update(siteId, formId, input, user.id));
  }

  @Delete(':formId')
  @Roles(...WRITE_ROLES)
  async remove(
    @CurrentSite() siteId: string,
    @Param('formId') formId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.forms.remove(siteId, formId, user.id);
    return ok({ success: true });
  }

  @Get(':formId/submissions')
  @Roles(...READ_ROLES)
  async submissions(
    @CurrentSite() siteId: string,
    @Param('formId') formId: string,
    @Query() query: unknown,
  ) {
    const parsed = submissionListQuerySchema.parse(query);
    const page = await this.forms.listSubmissions(siteId, formId, parsed);
    return ok(page.items, { cursor: page.cursor });
  }

  @Patch(':formId/submissions/:submissionId')
  @Roles(...WRITE_ROLES)
  async updateSubmission(
    @CurrentSite() siteId: string,
    @Param('formId') formId: string,
    @Param('submissionId') submissionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = updateSubmissionInputSchema.parse(body);
    return ok(await this.forms.updateSubmission(siteId, formId, submissionId, input, user.id));
  }
}

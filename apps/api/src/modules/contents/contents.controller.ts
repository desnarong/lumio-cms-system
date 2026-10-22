import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  contentListQuerySchema,
  createContentInputSchema,
  createContentVersionInputSchema,
  createTranslationInputSchema,
  saveContentBlocksInputSchema,
  seoPatchSchema,
  translateContentInputSchema,
  updateContentInputSchema,
  type Role,
} from '@lumio/shared';
import { ok } from '../../common/api-response';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { ContentsService } from './contents.service';

/** The site is taken from `X-Site-Id`; `:contentId` is never a site id. */
const READ_ROLES: Role[] = ['owner', 'admin', 'editor', 'author', 'viewer'];
const WRITE_ROLES: Role[] = ['owner', 'admin', 'editor', 'author'];
const PUBLISH_ROLES: Role[] = ['owner', 'admin', 'editor'];

@Controller('v1/contents')
@UseGuards(AuthGuard, SiteGuard, RolesGuard)
export class ContentsController {
  constructor(private readonly contents: ContentsService) {}

  @Get()
  @Roles(...READ_ROLES)
  async list(@CurrentSite() siteId: string, @Query() query: unknown) {
    const { cursor, limit, type, status, q, locale } = contentListQuerySchema.parse(query);
    const page = await this.contents.list(siteId, { cursor, limit }, { type, status, q, locale });
    return ok(page.items, { cursor: page.cursor });
  }

  @Post()
  @Roles(...WRITE_ROLES)
  async create(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = createContentInputSchema.parse(body);
    return ok(await this.contents.create(siteId, input, user.id));
  }

  @Get(':contentId')
  @Roles(...READ_ROLES)
  async getOne(@CurrentSite() siteId: string, @Param('contentId') contentId: string) {
    return ok(await this.contents.get(siteId, contentId));
  }

  /** Short-lived draft preview link (docs/design/10-architecture.md 10.4). */
  @Post(':contentId/preview-link')
  @Roles(...WRITE_ROLES)
  async previewLink(
    @CurrentSite() siteId: string,
    @Param('contentId') contentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return ok(await this.contents.createPreviewLink(siteId, contentId, user.id));
  }

  @Patch(':contentId')
  @Roles(...WRITE_ROLES)
  async update(
    @CurrentSite() siteId: string,
    @Param('contentId') contentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = updateContentInputSchema.parse(body);
    return ok(await this.contents.update(siteId, contentId, input, user.id));
  }

  /** Fixes the meta text of one page, merging only the fields that were sent. */
  @Patch(':contentId/seo')
  @Roles(...WRITE_ROLES)
  async updateSeo(
    @CurrentSite() siteId: string,
    @Param('contentId') contentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = seoPatchSchema.parse(body);
    return ok(await this.contents.updateSeo(siteId, contentId, input, user.id));
  }

  @Delete(':contentId')
  @Roles(...WRITE_ROLES)
  async remove(
    @CurrentSite() siteId: string,
    @Param('contentId') contentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.contents.remove(siteId, contentId, user.id);
    return ok({ success: true });
  }

  /** Autosave from the editor; guarded by the optimistic lock on `baseRevision`. */
  @Put(':contentId/blocks')
  @Roles(...WRITE_ROLES)
  async saveBlocks(
    @CurrentSite() siteId: string,
    @Param('contentId') contentId: string,
    @Body() body: unknown,
  ) {
    const input = saveContentBlocksInputSchema.parse(body);
    return ok(await this.contents.saveBlocks(siteId, contentId, input));
  }

  @Post(':contentId/publish')
  @Roles(...PUBLISH_ROLES)
  async publish(
    @CurrentSite() siteId: string,
    @Param('contentId') contentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return ok(await this.contents.publish(siteId, contentId, user.id));
  }

  @Get(':contentId/versions')
  @Roles(...READ_ROLES)
  async versions(@CurrentSite() siteId: string, @Param('contentId') contentId: string) {
    return ok(await this.contents.listVersions(siteId, contentId));
  }

  @Post(':contentId/versions')
  @Roles(...WRITE_ROLES)
  async saveVersion(
    @CurrentSite() siteId: string,
    @Param('contentId') contentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = createContentVersionInputSchema.parse(body ?? {});
    return ok(await this.contents.createVersion(siteId, contentId, input, user.id));
  }

  @Get(':contentId/versions/:versionId')
  @Roles(...READ_ROLES)
  async version(
    @CurrentSite() siteId: string,
    @Param('contentId') contentId: string,
    @Param('versionId') versionId: string,
  ) {
    return ok(await this.contents.getVersion(siteId, contentId, versionId));
  }

  @Post(':contentId/restore/:versionId')
  @Roles(...WRITE_ROLES)
  async restore(
    @CurrentSite() siteId: string,
    @Param('contentId') contentId: string,
    @Param('versionId') versionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return ok(await this.contents.restoreVersion(siteId, contentId, versionId, user.id));
  }

  /** Brings a page back from the trash as a draft. */
  @Post(':contentId/restore')
  @Roles(...WRITE_ROLES)
  async restoreFromTrash(
    @CurrentSite() siteId: string,
    @Param('contentId') contentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return ok(await this.contents.restore(siteId, contentId, user.id));
  }

  /** Every language of one page, for the admin language switcher. */
  @Get(':contentId/translations')
  @Roles(...READ_ROLES)
  async translations(@CurrentSite() siteId: string, @Param('contentId') contentId: string) {
    return ok(await this.contents.translations(siteId, contentId));
  }

  /** Creates this page in another language from its structure (docs/design/17-i18n.md). */
  @Post(':contentId/translate')
  @Roles(...WRITE_ROLES)
  async translate(
    @CurrentSite() siteId: string,
    @Param('contentId') contentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = createTranslationInputSchema.parse(body ?? {});
    return ok(await this.contents.createTranslation(siteId, contentId, input, user.id));
  }

  /** Finishes translating this page's own copy into its language (17-i18n.md 17.4). */
  @Post(':contentId/translate-content')
  @Roles(...WRITE_ROLES)
  async translateContent(
    @CurrentSite() siteId: string,
    @Param('contentId') contentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = translateContentInputSchema.parse(body ?? {});
    return ok(await this.contents.translateContent(siteId, contentId, input, user.id));
  }
}

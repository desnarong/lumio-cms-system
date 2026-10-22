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
  bulkUpdateMediaInputSchema,
  confirmUploadInputSchema,
  mediaListQuerySchema,
  presignUploadInputSchema,
  updateMediaInputSchema,
  type Role,
} from '@lumio/shared';
import { ok } from '../../common/api-response';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit.guard';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { MediaService } from './media.service';

/** The site always comes from `X-Site-Id`; `:mediaId` is never a site id. */
const READ_ROLES: Role[] = ['owner', 'admin', 'editor', 'author', 'viewer'];
const WRITE_ROLES: Role[] = ['owner', 'admin', 'editor', 'author'];

/** Each presign reserves a storage key, so it gets its own budget. */
const PRESIGN_RATE_LIMIT = { limit: 120, windowMs: 60_000 };

@Controller('v1/media')
@UseGuards(AuthGuard, SiteGuard, RolesGuard, RateLimitGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  /** Reserves a storage key and returns the presigned upload URL. */
  @Post('presign')
  @Roles(...WRITE_ROLES)
  @RateLimit(PRESIGN_RATE_LIMIT)
  async presign(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = presignUploadInputSchema.parse(body);
    return ok(await this.media.presign(siteId, input, user.id));
  }

  @Post(':mediaId/confirm')
  @Roles(...WRITE_ROLES)
  async confirm(
    @CurrentSite() siteId: string,
    @Param('mediaId') mediaId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = confirmUploadInputSchema.parse(body);
    return ok(await this.media.confirm(siteId, mediaId, input, user.id));
  }

  /** Brand colours read from a logo, for wizard step 4. Read-only and cheap. */
  @Post(':mediaId/palette')
  @Roles(...READ_ROLES)
  async palette(@CurrentSite() siteId: string, @Param('mediaId') mediaId: string) {
    return ok(await this.media.palette(siteId, mediaId));
  }

  /** Declared before `:mediaId` so the literal path wins. */
  @Get('folders')
  @Roles(...READ_ROLES)
  async folders(@CurrentSite() siteId: string) {
    return ok({ folders: await this.media.listFolders(siteId) });
  }

  @Get()
  @Roles(...READ_ROLES)
  async list(@CurrentSite() siteId: string, @Query() query: unknown) {
    const { cursor, limit, q, folder } = mediaListQuerySchema.parse(query);
    const page = await this.media.list(siteId, { cursor, limit }, { q, folder });
    return ok(page.items, { cursor: page.cursor });
  }

  @Get(':mediaId')
  @Roles(...READ_ROLES)
  async getOne(@CurrentSite() siteId: string, @Param('mediaId') mediaId: string) {
    return ok(await this.media.get(siteId, mediaId));
  }

  /**
   * Describes several images and/or moves them to one folder. Declared before
   * `:mediaId` so the literal `bulk` segment is not read as an image id.
   */
  @Patch('bulk')
  @Roles(...WRITE_ROLES)
  async bulkUpdate(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = bulkUpdateMediaInputSchema.parse(body);
    return ok(await this.media.bulkUpdate(siteId, input, user.id));
  }

  @Patch(':mediaId')
  @Roles(...WRITE_ROLES)
  async update(
    @CurrentSite() siteId: string,
    @Param('mediaId') mediaId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = updateMediaInputSchema.parse(body);
    return ok(await this.media.update(siteId, mediaId, input, user.id));
  }

  /** Soft delete: the undo toast calls `restore` right after. */
  @Delete(':mediaId')
  @Roles(...WRITE_ROLES)
  async remove(
    @CurrentSite() siteId: string,
    @Param('mediaId') mediaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.media.remove(siteId, mediaId, user.id);
    return ok({ success: true });
  }

  @Post(':mediaId/restore')
  @Roles(...WRITE_ROLES)
  async restore(
    @CurrentSite() siteId: string,
    @Param('mediaId') mediaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return ok(await this.media.restore(siteId, mediaId, user.id));
  }
}
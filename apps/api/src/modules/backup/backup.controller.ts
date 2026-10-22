import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { backupScheduleInputSchema, siteImportInputSchema, type Role } from '@lumio/shared';
import { ok } from '../../common/api-response';
import { AuthGuard, type AuthenticatedUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../rbac/roles.decorator';
import { RolesGuard } from '../rbac/roles.guard';
import { CurrentSite } from '../site/current-site.decorator';
import { SiteGuard } from '../site/site.guard';
import { BackupService } from './backup.service';

/** Backup and restore live in Settings, which owners and admins may open. */
const BACKUP_ROLES: Role[] = ['owner', 'admin'];

/** Download and restore the whole site (docs/design/05-admin-ia.md "Backup & ประวัติเวอร์ชัน"). */
@Controller('v1/backup')
@UseGuards(AuthGuard, SiteGuard, RolesGuard)
export class BackupController {
  constructor(private readonly backup: BackupService) {}

  /** Schedule, recent snapshots and the last successful run. */
  @Get('overview')
  @Roles(...BACKUP_ROLES)
  async overview(@CurrentSite() siteId: string) {
    return ok(await this.backup.overview(siteId));
  }

  @Patch('schedule')
  @Roles(...BACKUP_ROLES)
  async schedule(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = backupScheduleInputSchema.parse(body);
    return ok(await this.backup.updateSchedule(siteId, input, user.id));
  }

  /** สำรองเดี๋ยวนี้ (the worker does the same on its daily tick). */
  @Post('snapshots')
  @Roles(...BACKUP_ROLES)
  async snapshot(@CurrentSite() siteId: string, @CurrentUser() user: AuthenticatedUser) {
    return ok(await this.backup.snapshot(siteId, 'manual', user.id));
  }

  @Get('snapshots/:id')
  @Roles(...BACKUP_ROLES)
  async download(@CurrentSite() siteId: string, @Param('id') id: string) {
    return ok(await this.backup.snapshotFile(siteId, id));
  }

  @Get('export')
  @Roles(...BACKUP_ROLES)
  async export(@CurrentSite() siteId: string) {
    return ok(await this.backup.exportSite(siteId));
  }

  @Post('import')
  @Roles(...BACKUP_ROLES)
  async import(
    @CurrentSite() siteId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ) {
    const input = siteImportInputSchema.parse(body);
    return ok(await this.backup.importSite(siteId, input, user.id));
  }
}

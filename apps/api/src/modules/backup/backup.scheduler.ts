import { Injectable, Logger } from '@nestjs/common';
import { backupDue, readBackupSchedule } from '@lumio/shared';
import { PrismaService } from '../prisma/prisma.service';
import { BackupService } from './backup.service';

const HALF_HOUR = 30 * 60 * 1000;

/**
 * Automatic daily backups (docs/design/03-scope.md "Auto Backup", 15-security.md).
 * The worker ticks every half hour; each site runs once a day after its chosen
 * hour, and the oldest snapshots fall out of the retention window. A site that
 * was already backed up today is skipped, so restarting the worker costs nothing.
 */
@Injectable()
export class BackupScheduler {
  private readonly logger = new Logger(BackupScheduler.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly db: PrismaService,
    private readonly backup: BackupService,
  ) {}

  start(intervalMs: number = HALF_HOUR): void {
    if (this.timer) return;
    void this.runDue().catch((error: unknown) => {
      this.logger.warn(`สำรองข้อมูลอัตโนมัติรอบแรกไม่สำเร็จ: ${String(error)}`);
    });
    this.timer = setInterval(() => {
      void this.runDue().catch((error: unknown) => {
        this.logger.warn(`สำรองข้อมูลอัตโนมัติไม่สำเร็จ: ${String(error)}`);
      });
    }, intervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  /** Runs every site whose daily snapshot is due; returns how many were taken. */
  async runDue(now: Date = new Date()): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    let created = 0;

    try {
      const sites = await this.db.site.findMany({
        select: { id: true, settings: true },
      });

      for (const site of sites) {
        const schedule = readBackupSchedule(site.settings);
        if (!schedule.enabled) continue;

        const lastRunAt = await this.db.forSite(site.id, async (tx) => {
          const row = await tx.siteBackup.findFirst({
            where: { siteId: site.id },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          });
          return row?.createdAt ?? null;
        });

        if (!backupDue(schedule, lastRunAt, now)) continue;

        await this.backup.snapshot(site.id, 'auto', null);
        const removed = await this.backup.purgeOld(site.id, schedule.retentionDays);
        created += 1;
        this.logger.log(
          `สำรองข้อมูลเว็บ ${site.id} แล้ว${removed > 0 ? ` (ลบไฟล์เก่า ${removed} ไฟล์)` : ''}`,
        );
      }
    } finally {
      this.running = false;
    }

    return created;
  }
}

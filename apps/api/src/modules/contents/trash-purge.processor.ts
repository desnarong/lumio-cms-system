import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ContentsService, type TrashPurgeSummary } from './contents.service';

/** Default cadence: once a day, which is plenty for a 30-day retention window. */
export const TRASH_PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * How often the purge runs (docs/design/05-admin-ia.md 5.1). Kept in an env var
 * so a deployment can make it more aggressive without a code change.
 */
export const trashPurgeIntervalMs = (): number => {
  const minutes = Number(process.env.TRASH_PURGE_INTERVAL_MINUTES ?? '1440');
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : 1440) * 60_000;
};

/**
 * The worker owns the trash purge (docs/design/10-architecture.md 10.2), so the
 * API only runs it when `TRASH_PURGE_INLINE=true` — handy for local development
 * when the worker is not running.
 */
export const trashPurgeInlineEnabled = (): boolean => process.env.TRASH_PURGE_INLINE === 'true';

/**
 * Deletes pages that have been in the trash longer than the retention window.
 * It is a background sweep rather than a queue, because there is nothing to
 * enqueue: the work is "find everything that aged out", which is cheap to repeat
 * and safe to run twice.
 */
@Injectable()
export class TrashPurgeProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TrashPurgeProcessor.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(private readonly contents: ContentsService) {}

  onModuleInit(): void {
    if (trashPurgeInlineEnabled()) this.start(trashPurgeIntervalMs());
  }

  onModuleDestroy(): void {
    this.stop();
  }

  /** Starts the sweep loop; the first pass runs immediately. */
  start(intervalMs = TRASH_PURGE_INTERVAL_MS): void {
    if (this.timer) return;
    void this.runOnce();
    this.timer = setInterval(() => void this.runOnce(), intervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  /** One sweep. Safe to call from tests; overlaps are skipped, not queued. */
  async runOnce(now: Date = new Date()): Promise<TrashPurgeSummary> {
    if (this.running) return { sites: 0, purged: 0 };
    this.running = true;
    try {
      const summary = await this.contents.purgeExpiredTrash(now);
      if (summary.purged > 0) {
        this.logger.log(
          `ลบถังขยะอัตโนมัติแล้ว ${summary.purged} รายการ จาก ${summary.sites} เว็บ`,
        );
      }
      return summary;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'ไม่ทราบสาเหตุ';
      this.logger.warn(`ลบถังขยะอัตโนมัติไม่สำเร็จ: ${reason}`);
      return { sites: 0, purged: 0 };
    } finally {
      this.running = false;
    }
  }
}

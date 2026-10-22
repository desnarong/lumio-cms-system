import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { MediaService, type MediaPurgeSummary } from './media.service';

/** Default cadence: once a day, which is plenty for a 30-day retention window. */
export const MEDIA_PURGE_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * How often the media sweep runs (docs/design/05-admin-ia.md "คลังรูป"). Kept in
 * an env var so a deployment can make it more aggressive without a code change.
 */
export const mediaPurgeIntervalMs = (): number => {
  const minutes = Number(process.env.MEDIA_PURGE_INTERVAL_MINUTES ?? '1440');
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : 1440) * 60_000;
};

/**
 * The worker owns the sweep (docs/design/10-architecture.md 10.2), so the API
 * only runs it when `MEDIA_PURGE_INLINE=true`; handy for local development when
 * the worker is not running.
 */
export const mediaPurgeInlineEnabled = (): boolean => process.env.MEDIA_PURGE_INLINE === 'true';

/**
 * Deletes images (and their rendered files) that have been in the trash longer
 * than the retention window. Same shape as the page purge: a periodic sweep that
 * is skipped when the previous pass is still running.
 */
@Injectable()
export class MediaPurgeProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaPurgeProcessor.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(private readonly media: MediaService) {}

  onModuleInit(): void {
    if (mediaPurgeInlineEnabled()) this.start(mediaPurgeIntervalMs());
  }

  onModuleDestroy(): void {
    this.stop();
  }

  /** Starts the sweep loop; the first pass runs immediately. */
  start(intervalMs = MEDIA_PURGE_INTERVAL_MS): void {
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
  async runOnce(now: Date = new Date()): Promise<MediaPurgeSummary> {
    if (this.running) return { sites: 0, purged: 0 };
    this.running = true;
    try {
      const summary = await this.media.purgeExpiredTrash(now);
      if (summary.purged > 0) {
        this.logger.log(
          `ลบรูปในถังขยะอัตโนมัติแล้ว ${summary.purged} รูป จาก ${summary.sites} เว็บ`,
        );
      }
      return summary;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'ไม่ทราบสาเหตุ';
      this.logger.warn(`ลบรูปในถังขยะอัตโนมัติไม่สำเร็จ: ${reason}`);
      return { sites: 0, purged: 0 };
    } finally {
      this.running = false;
    }
  }
}

import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { RetentionService } from './retention.service';
import { retentionInlineEnabled, retentionIntervalMs } from './retention.config';

/**
 * Daily retention sweep (page-view partitions + 404 log). The worker starts it
 * at boot, so next month's partition always exists before the month begins;
 * the API only runs it with `RETENTION_INLINE=true`.
 */
@Injectable()
export class RetentionScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RetentionScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(private readonly retention: RetentionService) {}

  onModuleInit(): void {
    if (retentionInlineEnabled()) this.start();
  }

  onModuleDestroy(): void {
    this.stop();
  }

  start(intervalMs: number = retentionIntervalMs()): void {
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

  /** Skipped while the previous pass is still running. */
  async runOnce(now: Date = new Date()): Promise<boolean> {
    if (this.running) return false;
    this.running = true;
    try {
      await this.retention.sweep(now);
      return true;
    } catch (error) {
      this.logger.warn(`retention sweep ไม่สำเร็จ: ${String(error)}`);
      return false;
    } finally {
      this.running = false;
    }
  }
}

import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { QueueConsumer } from '../../common/job-queue';
import { SiteLocaleService, type SiteLocaleRunSummary } from './site-locale.service';
import {
  SITE_LOCALE_QUEUE,
  type SiteLocaleJob,
  type SiteLocaleQueue,
} from './site-locale.queue';

export interface SiteLocaleRunReport {
  processed: number;
  failed: number;
}

/**
 * Consumes the language jobs (docs/design/17-i18n.md 17.1). With the in-process
 * driver the API drains its own queue on a short interval unless
 * `SITE_LOCALE_INLINE=false`; with `QUEUE_DRIVER=bullmq` the same class consumes
 * from Redis, so several workers can share the backlog.
 */
@Injectable()
export class SiteLocaleProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SiteLocaleProcessor.name);
  private consumer: QueueConsumer | null = null;
  private starting = false;
  private draining = false;

  constructor(
    @Inject(SITE_LOCALE_QUEUE) private readonly queue: SiteLocaleQueue,
    private readonly locales: SiteLocaleService,
  ) {}

  onModuleInit(): void {
    if (this.inlineEnabled()) void this.start();
  }

  onModuleDestroy(): void {
    void this.stop();
  }

  async start(pollMs = 1_000): Promise<void> {
    if (this.consumer || this.starting) return;
    this.starting = true;
    try {
      this.consumer = await this.queue.consume((job) => this.handle(job), { pollMs });
    } finally {
      this.starting = false;
    }
  }

  async stop(): Promise<void> {
    const consumer = this.consumer;
    this.consumer = null;
    await consumer?.stop();
  }

  /** Drains every job queued so far. Safe to call from tests. */
  async drain(): Promise<SiteLocaleRunReport> {
    if (this.draining) return { processed: 0, failed: 0 };
    this.draining = true;

    const report: SiteLocaleRunReport = { processed: 0, failed: 0 };
    try {
      for (;;) {
        const job = await this.queue.take();
        if (!job) break;

        try {
          await this.handle(job);
          report.processed += 1;
        } catch (error) {
          report.failed += 1;
          this.logger.warn(
            `สร้างภาษาของเว็บไม่สำเร็จ: ${error instanceof Error ? error.message : 'ไม่ทราบสาเหตุ'}`,
          );
        }
      }
      return report;
    } finally {
      this.draining = false;
    }
  }

  private async handle(job: SiteLocaleJob): Promise<SiteLocaleRunSummary> {
    try {
      const summary = await this.locales.run(job);
      this.queue.complete(job.id);
      return summary;
    } catch (error) {
      this.queue.fail(job, error instanceof Error ? error.message : 'unknown');
      throw error;
    }
  }

  /** The API drains its own queue unless a separate worker is deployed. */
  private inlineEnabled(): boolean {
    return process.env.SITE_LOCALE_INLINE !== 'false';
  }
}

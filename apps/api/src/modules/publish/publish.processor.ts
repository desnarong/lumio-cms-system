import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PUBLISH_TARGET_MS } from '@lumio/shared';
import type { QueueConsumer } from '../../common/job-queue';
import { CdnPurgeNotifier } from './cdn-purge.notifier';
import { PublishSettingsService } from './publish-settings.service';
import { PUBLISH_QUEUE, type PublishJob, type PublishQueue } from './publish.queue';
import { RendererNotifier } from './renderer-notifier';
import { StaticPublisher } from './static-publisher';

export interface PublishRunSummary {
  processed: number;
  failed: number;
  skipped: number;
}

/**
 * Consumes publish jobs and asks the renderer to rebuild the affected pages.
 *
 * With the in-process driver the API drains its own queue on a short interval
 * (setting `PUBLISH_INLINE=false` on the API and running the worker keeps the
 * deployment shape from docs/design/10-architecture.md 10.2). With
 * `QUEUE_DRIVER=bullmq` the same class consumes from Redis through the driver,
 * so several workers can share one backlog.
 *
 * Every address used here comes from the site's own publishing settings
 * (ตั้งค่า › การเผยแพร่), so a customer can point their site at their CDN
 * without anyone editing `.env`.
 */
@Injectable()
export class PublishProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PublishProcessor.name);
  private consumer: QueueConsumer | null = null;
  private starting = false;
  private draining = false;

  constructor(
    @Inject(PUBLISH_QUEUE) private readonly queue: PublishQueue,
    private readonly notifier: RendererNotifier,
    private readonly cdn: CdnPurgeNotifier,
    private readonly staticPages: StaticPublisher,
    private readonly settings: PublishSettingsService,
  ) {}

  onModuleInit(): void {
    if (this.inlineEnabled()) void this.start();
  }

  onModuleDestroy(): void {
    void this.stop();
  }

  /**
   * Subscribes the processor to the queue: the in-memory driver polls every
   * `pollMs`, while the Redis driver starts a BullMQ worker and gets notified.
   */
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
  async drain(): Promise<PublishRunSummary> {
    if (this.draining) return { processed: 0, failed: 0, skipped: 0 };
    this.draining = true;

    const summary: PublishRunSummary = { processed: 0, failed: 0, skipped: 0 };
    try {
      for (;;) {
        const job = await this.queue.take();
        if (!job) break;

        try {
          const outcome = await this.handle(job);
          summary.processed += 1;
          if (outcome === 'skipped') summary.skipped += 1;
        } catch {
          // The failure is already recorded on the queue; keep draining.
          summary.failed += 1;
        }
      }
    } finally {
      this.draining = false;
    }

    return summary;
  }

  /**
   * Handles one job. A failure is recorded on the queue and re-thrown so a
   * retrying driver (BullMQ) can try again.
   */
  private async handle(job: PublishJob): Promise<'processed' | 'skipped'> {
    job.attempts += 1;
    const config = await this.settings.config(job.siteId);

    const result = await this.notifier.revalidate(job.paths, job.host ?? undefined, {
      rendererUrl: config.rendererUrl,
    });
    if (!result.delivered && !result.skipped) {
      const reason = `renderer responded ${result.status ?? 'unreachable'}`;
      this.queue.fail(job, reason);
      this.logger.warn(`Publish job ${job.id} failed for site ${job.siteId}`);
      throw new Error(reason);
    }

    // Static upload and cache purge are independent, so they run together: the
    // 10-second target in 03-scope.md covers the whole publish, not each step.
    const [purge, written] = await Promise.all([
      config.purgeOnPublish
        ? this.cdn.purge(
            { cdnPurgeUrl: config.cdnPurgeUrl, cdnPurgeSecret: config.cdnPurgeSecret },
            job.host,
            job.paths,
          )
        : Promise.resolve({ delivered: false, skipped: true, status: null }),
      this.staticPages.publish(
        {
          rendererUrl: config.rendererUrl,
          staticPublishUrl: config.staticPublishUrl,
          staticPublishSecret: config.staticPublishSecret,
        },
        job.host,
        job.paths,
      ),
    ]);

    if (!purge.delivered && !purge.skipped) {
      this.logger.warn(`CDN purge failed for site ${job.siteId}`);
    }

    if (!written.skipped) {
      if (!written.delivered) {
        this.logger.warn(
          `Static publish failed for site ${job.siteId}: ${written.failures.join(', ')}`,
        );
      }
      if (written.durationMs > PUBLISH_TARGET_MS) {
        this.logger.warn(
          `Static publish for site ${job.siteId} took ${written.durationMs}ms (target ${PUBLISH_TARGET_MS}ms)`,
        );
      }
      try {
        await this.settings.recordRun(job.siteId, {
          durationMs: written.durationMs,
          delivered: written.delivered,
          failures: written.failures,
        });
      } catch (error) {
        // The site is already live; a bookkeeping failure must not retry it.
        this.logger.warn(`บันทึกผลการเผยแพร่ไม่สำเร็จ: ${String(error)}`);
      }
    }

    this.queue.complete(job.id);
    return result.skipped ? 'skipped' : 'processed';
  }

  private inlineEnabled(): boolean {
    return process.env.PUBLISH_INLINE !== 'false';
  }
}

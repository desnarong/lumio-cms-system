import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import sharp from 'sharp';
import {
  MEDIA_VARIANT_FORMATS,
  MEDIA_VARIANT_WIDTHS,
  mediaCropBox,
  mediaCropSchema,
  type MediaCrop,
  type MediaVariant,
  type UploadMimeType,
} from '@lumio/shared';
import type { QueueConsumer } from '../../common/job-queue';
import { PrismaService } from '../prisma/prisma.service';
import { mediaInlineEnabled, mediaMaxInputPixels } from './media.config';
import { MEDIA_QUEUE, type MediaJob, type MediaQueue } from './media.queue';
import { MEDIA_STORAGE, mimeForFormat, type MediaStorage } from './media.storage';

/** Injection token for the image pipeline, so tests can render without sharp. */
export const MEDIA_IMAGE_PIPELINE = 'LUMIO_MEDIA_IMAGE_PIPELINE';

export interface RenderedImage {
  width: number;
  height: number;
  variants: MediaVariant[];
}

export interface ImagePipeline {
  render(input: {
    key: string;
    mime: string;
    buffer: Buffer;
    crop?: MediaCrop | null;
  }): Promise<RenderedImage>;
}

export interface MediaRunSummary {
  processed: number;
  failed: number;
  skipped: number;
}

const FORMAT_BY_MIME: Record<UploadMimeType, string> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

/** Read the limit per call so tests and operators can tighten it via env. */
const sharpInputOptions = (): { animated: false; limitInputPixels: number } => ({
  animated: false,
  limitInputPixels: mediaMaxInputPixels(),
});

/** `site/yyyy/mm/uuid-name.jpg` → `site/yyyy/mm/uuid-name-1024.webp`. */
export const variantKeyFor = (key: string, width: number, format: string): string => {
  const dot = key.lastIndexOf('.');
  const slash = key.lastIndexOf('/');
  const base = dot > slash ? key.slice(0, dot) : key;
  return `${base}-${width}.${format}`;
};

const readCrop = (value: unknown): MediaCrop | null => {
  const parsed = mediaCropSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

const ladderFor = (width: number): number[] => {
  const smaller = MEDIA_VARIANT_WIDTHS.filter((candidate) => candidate < width);
  return [...smaller, width];
};

/** Cropped files get their own key so an uncropped original never wins in `srcset`. */
const croppedOriginalKey = (key: string, format: string): string => {
  const dot = key.lastIndexOf('.');
  const slash = key.lastIndexOf('/');
  const base = dot > slash ? key.slice(0, dot) : key;
  return `${base}-crop.${format}`;
};

/**
 * Renders the responsive ladder with sharp: every width gets a WebP and an AVIF
 * file, plus the original format as the safest `<img src>` fallback. Animated
 * GIFs are left alone, since flattening them would drop the animation.
 */
@Injectable()
export class SharpImagePipeline implements ImagePipeline {
  constructor(@Inject(MEDIA_STORAGE) private readonly storage: MediaStorage) {}

  async render({
    key,
    mime,
    buffer,
    crop,
  }: {
    key: string;
    mime: string;
    buffer: Buffer;
    crop?: MediaCrop | null;
  }): Promise<RenderedImage> {
    const original = sharp(buffer, sharpInputOptions());
    const metadata = await original.metadata();
    const width = metadata.autoOrient?.width ?? metadata.width ?? 0;
    const height = metadata.autoOrient?.height ?? metadata.height ?? 0;
    if (width <= 0 || height <= 0) throw new Error('อ่านขนาดรูปไม่สำเร็จ');

    const format = FORMAT_BY_MIME[mime as UploadMimeType] ?? 'jpeg';
    if (format === 'gif') {
      return {
        width,
        height,
        variants: [{ w: width, h: height, url: key, format, sizeBytes: buffer.length }],
      };
    }

    const box = crop ? mediaCropBox(crop, width, height) : null;
    const renderedWidth = box?.width ?? width;
    const renderedHeight = box?.height ?? height;

    const variants: MediaVariant[] = [];
    // The ladder keeps the widths of the full picture even when cropped: pages
    // that already store these keys then show the new crop instead of a stale file.
    for (const target of ladderFor(width)) {
      const targetHeight = Math.max(1, Math.round((renderedHeight * target) / renderedWidth));
      for (const output of MEDIA_VARIANT_FORMATS) {
        let pipeline = sharp(buffer, sharpInputOptions()).rotate();
        if (box) pipeline = pipeline.extract(box);
        const rendered = await pipeline
          .resize({ width: target, withoutEnlargement: !box })
          .toFormat(output, { quality: output === 'avif' ? 55 : 80 })
          .toBuffer();
        const variantKey = variantKeyFor(key, target, output);
        await this.storage.put(variantKey, rendered, mimeForFormat(output));
        variants.push({
          w: target,
          h: targetHeight,
          url: variantKey,
          format: output,
          sizeBytes: rendered.length,
        });
      }
    }

    if (!box) {
      // The untouched original keeps working for formats the ladder skipped.
      variants.push({ w: width, h: height, url: key, format, sizeBytes: buffer.length });
      return { width, height, variants };
    }

    // Cropped fallbacks are always WebP: one format keeps the `srcset` simple and
    // still carries transparency from PNG sources.
    const fallback = await sharp(buffer, sharpInputOptions())
      .rotate()
      .extract(box)
      .toFormat('webp', { quality: 82 })
      .toBuffer();
    const fallbackKey = croppedOriginalKey(key, 'webp');
    await this.storage.put(fallbackKey, fallback, mimeForFormat('webp'));
    variants.push({
      w: box.width,
      h: box.height,
      url: fallbackKey,
      format: 'webp',
      sizeBytes: fallback.length,
    });
    return { width: renderedWidth, height: renderedHeight, variants };
  }
}

/**
 * Consumes media jobs and renders the variants. In development the API drains
 * its own queue; setting `MEDIA_INLINE=false` and running the worker keeps the
 * process split from docs/design/10-architecture.md 10.2. With
 * `QUEUE_DRIVER=bullmq` jobs arrive from Redis instead.
 */
@Injectable()
export class MediaProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaProcessor.name);
  private consumer: QueueConsumer | null = null;
  private starting = false;
  private draining = false;

  constructor(
    @Inject(MEDIA_QUEUE) private readonly queue: MediaQueue,
    @Inject(MEDIA_IMAGE_PIPELINE) private readonly pipeline: ImagePipeline,
    @Inject(MEDIA_STORAGE) private readonly storage: MediaStorage,
    private readonly db: PrismaService,
  ) {}

  onModuleInit(): void {
    if (mediaInlineEnabled()) void this.start();
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

  /** Drains every queued job. Safe to call from tests. */
  async drain(): Promise<MediaRunSummary> {
    if (this.draining) return { processed: 0, failed: 0, skipped: 0 };
    this.draining = true;

    const summary: MediaRunSummary = { processed: 0, failed: 0, skipped: 0 };
    try {
      for (;;) {
        const job = await this.queue.take();
        if (!job) break;

        try {
          const rendered = await this.handle(job);
          summary.processed += 1;
          if (!rendered) summary.skipped += 1;
        } catch {
          // The failure is already recorded on the queue and on the row.
          summary.failed += 1;
        }
      }
    } finally {
      this.draining = false;
    }

    return summary;
  }

  /**
   * Handles one job. Returns false when there was nothing to do (deleted or
   * missing file); a real failure is recorded and re-thrown so a retrying
   * driver (BullMQ) can try again.
   */
  private async handle(job: MediaJob): Promise<boolean> {
    job.attempts += 1;
    try {
      const rendered = await this.process(job);
      this.queue.complete(job.id);
      return rendered;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'ไม่ทราบสาเหตุ';
      this.queue.fail(job, reason);
      await this.markFailed(job);
      this.logger.warn(`Media job ${job.id} failed for ${job.mediaId}: ${reason}`);
      throw error instanceof Error ? error : new Error(reason);
    }
  }

  /** Returns false when the job had nothing to do (deleted or missing file). */
  private async process(job: MediaJob): Promise<boolean> {
    const row = await this.db.forSite(job.siteId, (tx) =>
      tx.media.findUnique({ where: { id: job.mediaId } }),
    );
    if (!row || row.status === 'trashed') return false;

    const buffer = await this.storage.read(row.storageKey);
    if (!buffer) return false;

    const rendered = await this.pipeline.render({
      key: row.storageKey,
      mime: row.mime ?? 'image/jpeg',
      buffer,
      crop: readCrop(row.crop),
    });

    await this.db.forSite(job.siteId, (tx) =>
      tx.media.update({
        where: { id: job.mediaId },
        data: {
          width: rendered.width,
          height: rendered.height,
          sizeBytes: BigInt(buffer.length),
          variants: rendered.variants as unknown as Prisma.InputJsonValue,
          status: 'ready',
        },
      }),
    );
    return true;
  }

  private async markFailed(job: MediaJob): Promise<void> {
    try {
      await this.db.forSite(job.siteId, (tx) =>
        tx.media.update({ where: { id: job.mediaId }, data: { status: 'failed' } }),
      );
    } catch {
      // The row may have been deleted while processing; nothing to report.
    }
  }
}
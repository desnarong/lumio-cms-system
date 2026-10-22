import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { queueDriverName } from './common/job-queue';
import { BackupScheduler } from './modules/backup/backup.scheduler';
import { TrashPurgeProcessor } from './modules/contents/trash-purge.processor';
import { DomainsVerifier } from './modules/domains/domains.verifier';
import { MediaPurgeProcessor } from './modules/media/media-purge.processor';
import { MediaProcessor } from './modules/media/media.processor';
import { PublishProcessor } from './modules/publish/publish.processor';
import { SiteLocaleProcessor } from './modules/sites/site-locale.processor';

/**
 * Background worker (docs/design/10-architecture.md 10.2). It owns the publish
 * pipeline, the media pipeline and the trash purge: publish jobs become renderer
 * rebuilds, media jobs become the WebP/AVIF ladder, and the purge sweep deletes
 * pages and images that aged out of the trash. Email and backup jobs join the same process
 * as they land.
 *
 * With `QUEUE_DRIVER=bullmq` the two processors become BullMQ workers and pull
 * from Redis instead of polling the in-process queue, so several workers can
 * share the backlog.
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Worker');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // The worker always consumes; the API only does so when *_INLINE is on.
  const publish = app.get(PublishProcessor);
  await publish.start(2_000);
  const media = app.get(MediaProcessor);
  await media.start(2_000);
  const locales = app.get(SiteLocaleProcessor);
  await locales.start(2_000);
  const purge = app.get(TrashPurgeProcessor);
  purge.start();
  const mediaPurge = app.get(MediaPurgeProcessor);
  mediaPurge.start();
  const backups = app.get(BackupScheduler);
  backups.start();
  const domains = app.get(DomainsVerifier);
  domains.start();
  logger.log(
    `Lumio worker booted (${queueDriverName()} queue); consuming publish, media and language jobs, sweeping both trashes, scheduling daily backups, checking pending domains`,
  );

  const shutdown = async (): Promise<void> => {
    await publish.stop();
    await media.stop();
    await locales.stop();
    purge.stop();
    mediaPurge.stop();
    backups.stop();
    domains.stop();
    await app.close();
    logger.log('Lumio worker shutting down');
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}

void bootstrap();
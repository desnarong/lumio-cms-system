import { Module } from '@nestjs/common';
import { createJobQueue } from '../../common/bullmq-queue';
import { BillingModule } from '../billing/billing.module';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { MediaUploadController } from './media-upload.controller';
import { MediaController } from './media.controller';
import { MEDIA_QUEUE } from './media.queue';
import { MediaPurgeProcessor } from './media-purge.processor';
import { MEDIA_IMAGE_PIPELINE, MediaProcessor, SharpImagePipeline } from './media.processor';
import { MediaService } from './media.service';
import { MEDIA_SCANNER, createMediaScanner } from './media.scanner';
import { createS3MediaStorage } from './media.s3.storage';
import { LocalMediaStorage, MEDIA_STORAGE, type MediaStorage } from './media.storage';
import { mediaStorageDriver } from './media.config';

/**
 * Picks the object storage driver from `MEDIA_STORAGE`
 * (docs/design/18-deployment.md): `local` writes into `MEDIA_LOCAL_DIR` and is
 * served by the API, `s3` presigns uploads against `S3_*`.
 */
export const createMediaStorage = (): MediaStorage =>
  mediaStorageDriver() === 's3' ? createS3MediaStorage() : new LocalMediaStorage();

/**
 * Media library providers (docs/design/12-api.md 12.6). The storage driver and
 * the render pipeline sit behind injection tokens: production swaps in S3 and
 * the worker, while development runs the local driver in-process.
 */
@Module({
  imports: [BillingModule],
  controllers: [MediaController, MediaUploadController],
  providers: [
    { provide: MEDIA_STORAGE, useFactory: createMediaStorage },
    {
      provide: MEDIA_QUEUE,
      useFactory: () => createJobQueue({ name: MEDIA_QUEUE, prefix: 'med' }),
    },
    { provide: MEDIA_IMAGE_PIPELINE, useClass: SharpImagePipeline },
    { provide: MEDIA_SCANNER, useFactory: createMediaScanner },
    MediaProcessor,
    MediaPurgeProcessor,
    MediaService,
    SiteGuard,
    RolesGuard,
  ],
  exports: [MediaService, MediaProcessor, MediaPurgeProcessor, MEDIA_QUEUE, MEDIA_STORAGE, MEDIA_SCANNER],
})
export class MediaModule {}
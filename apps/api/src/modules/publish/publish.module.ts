import { Module } from '@nestjs/common';
import { createJobQueue } from '../../common/bullmq-queue';
import { RateLimitGuard } from '../../common/rate-limit.guard';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { CDN_PURGE_FETCH, CdnPurgeNotifier } from './cdn-purge.notifier';
import { PublishSettingsController } from './publish-settings.controller';
import { PublishSettingsService } from './publish-settings.service';
import { PUBLISH_QUEUE } from './publish.queue';
import { PublishProcessor } from './publish.processor';
import { PublishService } from './publish.service';
import { RENDERER_FETCH, RendererNotifier } from './renderer-notifier';
import { STATIC_PUBLISH_FETCH, StaticPublisher } from './static-publisher';

/**
 * Publish pipeline providers. The module is imported by every feature that can
 * trigger a rebuild (contents, sites) and instantiates once, so they all share
 * the same queue.
 *
 * The driver follows `QUEUE_DRIVER`: in-process by default, Redis/BullMQ in a
 * multi-instance deployment (docs/design/18-deployment.md).
 */
@Module({
  controllers: [PublishSettingsController],
  providers: [
    {
      provide: PUBLISH_QUEUE,
      useFactory: () => createJobQueue({ name: PUBLISH_QUEUE, prefix: 'pub' }),
    },
    { provide: RENDERER_FETCH, useValue: fetch },
    { provide: CDN_PURGE_FETCH, useValue: fetch },
    { provide: STATIC_PUBLISH_FETCH, useValue: fetch },
    RendererNotifier,
    CdnPurgeNotifier,
    StaticPublisher,
    PublishProcessor,
    PublishService,
    PublishSettingsService,
    SiteGuard,
    RolesGuard,
    RateLimitGuard,
  ],
  exports: [PublishService, PublishProcessor, PublishSettingsService, PUBLISH_QUEUE],
})
export class PublishModule {}
import { Module } from '@nestjs/common';
import { Mailer } from '../../common/mailer';
import { mediaStorageDriver } from '../media/media.config';
import { createS3MediaStorage } from '../media/media.s3.storage';
import { LocalMediaStorage, MEDIA_STORAGE, type MediaStorage } from '../media/media.storage';
import { PublicModule } from '../public/public.module';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { CommerceController } from './commerce.controller';
import { CommerceService } from './commerce.service';
import { OrderNotifier } from './order-notifier';
import { OrderWebhookNotifier } from './order-webhook';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';

/** Slips use the same object storage as the media library without importing it. */
const createSlipStorage = (): MediaStorage =>
  mediaStorageDriver() === 's3' ? createS3MediaStorage() : new LocalMediaStorage();

@Module({
  imports: [PublicModule],
  controllers: [CommerceController, ShopController],
  providers: [
    CommerceService,
    ShopService,
    OrderNotifier,
    OrderWebhookNotifier,
    Mailer,
    SiteGuard,
    RolesGuard,
    { provide: MEDIA_STORAGE, useFactory: createSlipStorage },
  ],
  exports: [CommerceService, ShopService],
})
export class CommerceModule {}

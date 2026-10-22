import { Module } from '@nestjs/common';
import { createJobQueue } from '../../common/bullmq-queue';
import { ContentsModule } from '../contents/contents.module';
import { PublishModule } from '../publish/publish.module';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { TemplatesModule } from '../templates/templates.module';
import { SiteLocaleProcessor } from './site-locale.processor';
import { SITE_LOCALE_QUEUE } from './site-locale.queue';
import { SiteLocaleService } from './site-locale.service';
import { SiteWizardService } from './site-wizard.service';
import { SitesController } from './sites.controller';
import { SitesService } from './sites.service';

@Module({
  imports: [PublishModule, TemplatesModule, ContentsModule],
  controllers: [SitesController],
  providers: [
    {
      provide: SITE_LOCALE_QUEUE,
      useFactory: () => createJobQueue({ name: SITE_LOCALE_QUEUE, prefix: 'loc' }),
    },
    SitesService,
    SiteWizardService,
    SiteLocaleService,
    SiteLocaleProcessor,
    SiteGuard,
    RolesGuard,
  ],
  exports: [SitesService, SiteLocaleService, SiteLocaleProcessor],
})
export class SitesModule {}

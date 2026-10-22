import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { BillingModule } from '../billing/billing.module';
import { PublishModule } from '../publish/publish.module';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { ContentsController } from './contents.controller';
import { ContentsService } from './contents.service';
import { TrashPurgeProcessor } from './trash-purge.processor';

@Module({
  imports: [BillingModule, PublishModule, AiModule],
  controllers: [ContentsController],
  providers: [ContentsService, TrashPurgeProcessor, SiteGuard, RolesGuard],
  exports: [ContentsService, TrashPurgeProcessor],
})
export class ContentsModule {}

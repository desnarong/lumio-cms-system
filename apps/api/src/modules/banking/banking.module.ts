import { Module } from '@nestjs/common';
import { CommerceModule } from '../commerce/commerce.module';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { BankingController } from './banking.controller';
import { BankingService } from './banking.service';
import { BblGatewayService } from './bbl-gateway.service';
import { BblWebhookController } from './bbl.webhook.controller';

@Module({
  imports: [CommerceModule],
  controllers: [BankingController, BblWebhookController],
  providers: [BankingService, BblGatewayService, SiteGuard, RolesGuard],
  exports: [BankingService],
})
export class BankingModule {}

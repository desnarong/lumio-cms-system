import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';

@Module({
  imports: [AuditModule],
  controllers: [NewsletterController],
  providers: [NewsletterService, SiteGuard, RolesGuard],
  exports: [NewsletterService],
})
export class NewsletterModule {}

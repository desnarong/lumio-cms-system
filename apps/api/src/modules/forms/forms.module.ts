import { Module } from '@nestjs/common';
import { RateLimitGuard } from '../../common/rate-limit.guard';
import { AuditModule } from '../audit/audit.module';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { EmailModule } from '../email/email.module';
import { FORM_NOTIFIER, SiteFormNotifier } from './form-notifier';
import { FormsController } from './forms.controller';
import { FormsService } from './forms.service';
import { PublicFormsController } from './public-forms.controller';

@Module({
  imports: [AuditModule, EmailModule],
  controllers: [FormsController, PublicFormsController],
  providers: [
    FormsService,
    SiteGuard,
    RolesGuard,
    RateLimitGuard,
    { provide: FORM_NOTIFIER, useClass: SiteFormNotifier },
  ],
  exports: [FormsService],
})
export class FormsModule {}

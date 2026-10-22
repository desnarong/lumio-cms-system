import { Module } from '@nestjs/common';
import { Mailer } from '../../common/mailer';
import { RateLimitGuard } from '../../common/rate-limit.guard';
import { AuditModule } from '../audit/audit.module';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { EmailController } from './email.controller';
import { EMAIL_DELIVERY, EmailService } from './email.service';
import { deliverEmail } from './email.delivery';

@Module({
  imports: [AuditModule],
  controllers: [EmailController],
  providers: [
    EmailService,
    Mailer,
    SiteGuard,
    RolesGuard,
    RateLimitGuard,
    { provide: EMAIL_DELIVERY, useValue: deliverEmail },
  ],
  exports: [EmailService],
})
export class EmailModule {}

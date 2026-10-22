import { Module } from '@nestjs/common';
import { RateLimitGuard } from '../../common/rate-limit.guard';
import { AuditModule } from '../audit/audit.module';
import { RolesGuard } from '../rbac/roles.guard';
import { SiteGuard } from '../site/site.guard';
import { DOMAIN_VERIFIER, createDnsDomainVerifier } from './dns-verifier';
import { DomainsController } from './domains.controller';
import { DomainsService } from './domains.service';
import { DomainsTlsController } from './domains-tls.controller';
import { DomainsVerifier } from './domains.verifier';

@Module({
  imports: [AuditModule],
  controllers: [DomainsController, DomainsTlsController],
  providers: [
    DomainsService,
    DomainsVerifier,
    SiteGuard,
    RolesGuard,
    RateLimitGuard,
    { provide: DOMAIN_VERIFIER, useFactory: createDnsDomainVerifier },
  ],
  exports: [DomainsService, DomainsVerifier],
})
export class DomainsModule {}

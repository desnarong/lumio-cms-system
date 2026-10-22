import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { ApiException } from '../../common/api-error';
import { ok } from '../../common/api-response';
import { RateLimit, RateLimitGuard } from '../../common/rate-limit.guard';
import { DomainsService } from './domains.service';

/**
 * The endpoint Caddy calls before issuing an on-demand certificate
 * (docs/design/18-deployment.md 18.5). It is server-to-server and therefore
 * has no auth guard, but it answers the same "no" for unknown and unverified
 * hostnames so it cannot be used to enumerate domains.
 */
@Controller('v1/public/tls')
@UseGuards(RateLimitGuard)
export class DomainsTlsController {
  constructor(private readonly domains: DomainsService) {}

  @Get('ask')
  @RateLimit({ limit: 120, windowMs: 60_000 })
  @Header('cache-control', 'no-store')
  async ask(@Query('domain') domain: unknown) {
    const hostname = typeof domain === 'string' ? domain : '';
    if (!(await this.domains.canIssueCertificate(hostname))) {
      throw ApiException.forbidden('โดเมนนี้ยังไม่ผ่านการยืนยัน');
    }
    return ok({ allowed: true });
  }
}

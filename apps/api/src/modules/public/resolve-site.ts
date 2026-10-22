import type { Site } from '@prisma/client';
import { ApiException } from '../../common/api-error';
import type { PrismaService } from '../prisma/prisma.service';
import { isLoopbackHost, normalizeHost, subdomainOf } from './host';

/**
 * Resolves the tenant a request host belongs to: a verified custom domain first,
 * then the free `*.lumio.app` subdomain. Loopback hosts only resolve when
 * `PUBLIC_DEFAULT_SITE` is set, which keeps local preview working without ever
 * leaking one site onto another host. Unknown hosts answer 404.
 *
 * Shared by the public delivery routes and the public form submission so both
 * agree on which site a host is (docs/design/12-api.md 12.7).
 */
export const resolveSiteByHost = async (db: PrismaService, host: string): Promise<Site> => {
  const hostname = normalizeHost(host);
  if (hostname.length === 0) throw ApiException.notFound('ไม่พบเว็บไซต์นี้');

  const domain = await db.domain.findUnique({ where: { hostname }, include: { site: true } });
  if (domain?.site) return domain.site;

  const subdomain = subdomainOf(hostname);
  if (subdomain) {
    const site = await db.site.findUnique({ where: { subdomain } });
    if (site) return site;
  }

  if (isLoopbackHost(hostname)) {
    const fallback = process.env.PUBLIC_DEFAULT_SITE;
    if (fallback) {
      const site = await db.site.findUnique({ where: { subdomain: fallback } });
      if (site) return site;
    }
  }

  throw ApiException.notFound('ไม่พบเว็บไซต์นี้');
};

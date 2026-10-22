import { Inject, Injectable } from '@nestjs/common';
import {
  isSslStatus,
  type AddDomainInput,
  type DomainList,
  type DomainSummary,
  type DomainVerifyResult,
} from '@lumio/shared';
import type { Domain } from '@prisma/client';
import { ApiException } from '../../common/api-error';
import { AuditService } from '../audit/audit.service';
import { rootDomain, normalizeHost } from '../public/host';
import { PrismaService } from '../prisma/prisma.service';
import { DOMAIN_VERIFIER, type DomainVerifier } from './dns-verifier';

const toSummary = (domain: Domain): DomainSummary => ({
  id: domain.id,
  hostname: domain.hostname,
  isPrimary: domain.isPrimary,
  sslStatus: isSslStatus(domain.sslStatus) ? domain.sslStatus : 'pending',
  verifiedAt: domain.verifiedAt ? domain.verifiedAt.toISOString() : null,
  createdAt: domain.createdAt.toISOString(),
});

/**
 * Custom domains (docs/design/18-deployment.md). A site always works on its free
 * `*.example.com` subdomain; connecting an owned domain is optional and only takes
 * effect once DNS points at that subdomain.
 */
@Injectable()
export class DomainsService {
  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
    @Inject(DOMAIN_VERIFIER) private readonly verifier: DomainVerifier,
  ) {}

  async list(siteId: string): Promise<DomainList> {
    const [items, cnameTarget] = await Promise.all([
      this.db.forSite(siteId, (tx) =>
        tx.domain.findMany({ orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] }),
      ),
      this.cnameTarget(siteId),
    ]);

    return { items: items.map(toSummary), cnameTarget };
  }

  async add(siteId: string, input: AddDomainInput, actorId: string): Promise<DomainSummary> {
    const cnameTarget = await this.cnameTarget(siteId);
    if (input.hostname === cnameTarget) {
      throw ApiException.validation('ที่อยู่นี้เป็นที่อยู่ฟรีของเว็บคุณอยู่แล้ว');
    }

    const taken = await this.db.domain.findUnique({
      where: { hostname: input.hostname },
      select: { id: true },
    });
    if (taken) throw ApiException.conflict('โดเมนนี้ถูกใช้งานแล้ว');

    const domain = await this.db.forSite(siteId, async (tx) => {
      if (input.isPrimary) {
        await tx.domain.updateMany({ where: { isPrimary: true }, data: { isPrimary: false } });
      }
      const created = await tx.domain.create({
        data: { siteId, hostname: input.hostname, isPrimary: input.isPrimary },
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'domain.add',
          target: created.id,
          meta: { hostname: created.hostname, isPrimary: created.isPrimary },
        },
      });
      return created;
    });

    return toSummary(domain);
  }

  async remove(siteId: string, domainId: string, actorId: string): Promise<void> {
    await this.db.forSite(siteId, async (tx) => {
      const current = await tx.domain.findUnique({ where: { id: domainId } });
      if (!current) throw ApiException.notFound('ไม่พบโดเมนนี้');

      await tx.domain.delete({ where: { id: domainId } });
      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'domain.remove',
          target: domainId,
          meta: { hostname: current.hostname },
        },
      });
    });
  }

  /** Re-checks DNS and turns the domain on when it points at the site. */
  async verify(siteId: string, domainId: string, actorId: string): Promise<DomainVerifyResult> {
    const cnameTarget = await this.cnameTarget(siteId);
    const current = await this.db.forSite(siteId, (tx) =>
      tx.domain.findUnique({ where: { id: domainId } }),
    );
    if (!current) throw ApiException.notFound('ไม่พบโดเมนนี้');

    const resolved = await this.verifier.resolves(current.hostname, cnameTarget);
    if (!resolved) {
      return { verified: false, domain: toSummary(current) };
    }

    const updated = await this.db.forSite(siteId, async (tx) => {
      const next = await tx.domain.update({
        where: { id: domainId },
        data: { verifiedAt: new Date(), sslStatus: 'active' },
      });
      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'domain.verify',
          target: domainId,
          meta: { hostname: next.hostname },
        },
      });
      return next;
    });

    return { verified: true, domain: toSummary(updated) };
  }

  /**
   * Re-checks every domain the owner added but DNS has not pointed here yet.
   * The worker runs this on a timer, so a customer only has to change the DNS
   * record at their registrar: no second visit to the admin, and Caddy issues
   * the certificate on demand once the domain turns active
   * (docs/design/18-deployment.md 18.5).
   */
  async autoVerify(): Promise<number> {
    const pending = await this.db.domain.findMany({
      where: { verifiedAt: null, sslStatus: 'pending' },
      select: { id: true, siteId: true, hostname: true },
      take: 100,
    });

    let activated = 0;
    for (const domain of pending) {
      const site = await this.db.site.findUnique({
        where: { id: domain.siteId },
        select: { subdomain: true },
      });
      if (!site) continue;

      const target = `${site.subdomain}.${rootDomain()}`;
      if (!(await this.verifier.resolves(domain.hostname, target))) continue;

      await this.db.forSite(domain.siteId, async (tx) => {
        await tx.domain.update({
          where: { id: domain.id },
          data: { verifiedAt: new Date(), sslStatus: 'active' },
        });
        await tx.auditLog.create({
          data: {
            siteId: domain.siteId,
            action: 'domain.verify.auto',
            target: domain.id,
            meta: { hostname: domain.hostname },
          },
        });
      });
      activated += 1;
    }

    return activated;
  }

  /**
   * Caddy's on-demand TLS `ask` hook (docs/design/18-deployment.md 18.5).
   * A certificate may only be issued for a hostname this platform already
   * verified, so pointing an arbitrary domain at our address cannot mint one.
   */
  async canIssueCertificate(hostname: string): Promise<boolean> {
    const normalized = normalizeHost(hostname);
    if (!normalized || normalized.length > 253) return false;

    const domain = await this.db.domain.findUnique({
      where: { hostname: normalized },
      select: { sslStatus: true, verifiedAt: true },
    });
    return domain !== null && domain.sslStatus === 'active' && domain.verifiedAt !== null;
  }

  /** Free address of the site: `<subdomain>.<root domain>`. */
  private async cnameTarget(siteId: string): Promise<string> {
    const site = await this.db.site.findUnique({
      where: { id: siteId },
      select: { subdomain: true },
    });
    if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
    return `${site.subdomain}.${rootDomain()}`;
  }
}

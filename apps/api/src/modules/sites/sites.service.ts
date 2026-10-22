import { Injectable } from '@nestjs/common';
import {
  isRole,
  normalizeLocales,
  type PaginationQuery,
  type Role,
  type SiteSummary,
  type UpdateSiteInput,
} from '@lumio/shared';
import type { Prisma, Site } from '@prisma/client';
import { ApiException } from '../../common/api-error';
import type { Page } from '../../common/pagination';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublishService } from '../publish/publish.service';

export interface PublishAllResult {
  published: number;
}

const toSummary = (site: Site, role: string): SiteSummary => ({
  id: site.id,
  name: site.name,
  subdomain: site.subdomain,
  localeDefault: site.localeDefault,
  locales: site.locales,
  plan: site.plan,
  role: isRole(role) ? role : 'viewer',
  createdAt: site.createdAt.toISOString(),
});

@Injectable()
export class SitesService {
  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
    private readonly publishJobs: PublishService,
  ) {}

  async listForUser(userId: string, page: PaginationQuery): Promise<Page<SiteSummary>> {
    const memberships = await this.db.forUser(userId, (tx) =>
      tx.siteMember.findMany({
        where: { userId },
        include: { site: true },
        orderBy: [{ createdAt: 'asc' }, { siteId: 'asc' }],
        take: page.limit + 1,
        ...(page.cursor
          ? { cursor: { siteId_userId: { siteId: page.cursor, userId } }, skip: 1 }
          : {}),
      }),
    );

    const items = memberships
      .slice(0, page.limit)
      .map((membership) => toSummary(membership.site, membership.role));
    return { items, cursor: memberships.length > page.limit ? (items.at(-1)?.id ?? null) : null };
  }

  async get(siteId: string, role: Role): Promise<SiteSummary> {
    const site = await this.db.forSite(siteId, (tx) =>
      tx.site.findUnique({ where: { id: siteId } }),
    );
    if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
    return toSummary(site, role);
  }

  async update(
    siteId: string,
    input: UpdateSiteInput,
    actorId: string,
    role: Role,
  ): Promise<SiteSummary> {
    if (input.subdomain) await this.assertSubdomainFree(input.subdomain);

    const site = await this.db.forSite(siteId, async (tx) => {
      const current = await tx.site.findUnique({ where: { id: siteId } });
      if (!current) throw ApiException.notFound('ไม่พบเว็บนี้');

      const settings =
        input.settings === undefined
          ? undefined
          : ({
              ...(current.settings as Record<string, unknown>),
              ...input.settings,
            } as Prisma.InputJsonValue);

      // The default language always stays in the list and always comes first, so
      // the URL rules and the language switcher never have to re-sort.
      const nextDefault = input.localeDefault ?? current.localeDefault;
      const locales = input.locales
        ? normalizeLocales(input.locales, nextDefault)
        : input.localeDefault !== undefined
          ? normalizeLocales(current.locales, nextDefault)
          : undefined;

      const updated = await tx.site.update({
        where: { id: siteId },
        data: {
          name: input.name ?? undefined,
          subdomain: input.subdomain ?? undefined,
          localeDefault: input.localeDefault ?? undefined,
          locales,
          settings,
        },
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'site.update',
          target: siteId,
          meta: { fields: Object.keys(input) } satisfies Prisma.InputJsonObject,
        },
      });

      return updated;
    });

    return toSummary(site, role);
  }

  async publishAll(siteId: string, actorId: string): Promise<PublishAllResult> {
    const result = await this.db.forSite(siteId, async (tx) => {
      const drafts = await tx.content.findMany({
        where: { status: { in: ['draft', 'scheduled'] } },
        select: { id: true, blocksDraft: true, revision: true },
      });

      const publishedAt = new Date();
      for (const content of drafts) {
        await tx.content.update({
          where: { id: content.id },
          data: {
            status: 'published',
            blocksPublished: content.blocksDraft as Prisma.InputJsonValue,
            publishedAt,
            scheduledAt: null,
            revision: content.revision + 1,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'site.publish_all',
          target: siteId,
          meta: { published: drafts.length },
        },
      });

      return { published: drafts.length };
    });

    // "Publish all" rebuilds the whole public site, not one page.
    await this.publishJobs.enqueueSite(siteId);
    return result;
  }

  private async assertSubdomainFree(subdomain: string): Promise<void> {
    const taken = await this.db.site.findUnique({ where: { subdomain }, select: { id: true } });
    if (taken) throw ApiException.conflict('subdomain นี้ถูกใช้งานแล้ว');
  }
}

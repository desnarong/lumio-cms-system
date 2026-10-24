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
import { toPublicMediaUrl } from '../media/media-url';
import { PrismaService } from '../prisma/prisma.service';
import { PublishService } from '../publish/publish.service';

export interface PublishAllResult {
  published: number;
}

/** Keys in `sites.settings` that point at an uploaded brand image. */
const BRAND_KEYS = ['logoMediaId', 'faviconMediaId'] as const;

interface BrandUrls {
  logoUrl: string | null;
  faviconUrl: string | null;
}

const NO_BRAND: BrandUrls = { logoUrl: null, faviconUrl: null };

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** Resolves the logo and favicon that belong to this site, never another one. */
const resolveBrand = async (
  tx: Prisma.TransactionClient,
  settings: unknown,
): Promise<BrandUrls> => {
  const record = asRecord(settings);
  const ids = BRAND_KEYS.flatMap((key) => {
    const value = record[key];
    return typeof value === 'string' && value.length > 0 ? [value] : [];
  });
  if (ids.length === 0) return NO_BRAND;

  const rows = await tx.media.findMany({
    where: { id: { in: ids } },
    select: { id: true, storageKey: true, variants: true, status: true },
  });
  const urlOf = (key: (typeof BRAND_KEYS)[number]): string | null => {
    const id = record[key];
    if (typeof id !== 'string') return null;
    return toPublicMediaUrl(rows.find((row) => row.id === id) ?? null);
  };
  return { logoUrl: urlOf('logoMediaId'), faviconUrl: urlOf('faviconMediaId') };
};

const toSummary = (site: Site, role: string, brand: BrandUrls = NO_BRAND): SiteSummary => ({
  id: site.id,
  name: site.name,
  subdomain: site.subdomain,
  localeDefault: site.localeDefault,
  locales: site.locales,
  plan: site.plan,
  role: isRole(role) ? role : 'viewer',
  createdAt: site.createdAt.toISOString(),
  ...brand,
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
    const brand = await this.db.forSite(siteId, (tx) => resolveBrand(tx, site.settings));
    return toSummary(site, role, brand);
  }

  async update(
    siteId: string,
    input: UpdateSiteInput,
    actorId: string,
    role: Role,
  ): Promise<SiteSummary> {
    if (input.subdomain) await this.assertSubdomainFree(siteId, input.subdomain);

    // The logo and favicon live in the header of every page, so a change has to
    // clear the renderer cache for the whole site, not just the home page.
    const brandChanged =
      input.settings !== undefined &&
      BRAND_KEYS.some((key) => Object.prototype.hasOwnProperty.call(input.settings, key));

    const site = await this.db.forSite(siteId, async (tx) => {
      const current = await tx.site.findUnique({ where: { id: siteId } });
      if (!current) throw ApiException.notFound('ไม่พบเว็บนี้');

      // A media id must belong to this site (RLS scopes the lookup), otherwise a
      // crafted request could point the header at another site's upload.
      if (input.settings !== undefined) {
        for (const key of BRAND_KEYS) {
          const value = input.settings[key];
          if (value === undefined || value === null) continue;
          if (typeof value !== 'string') {
            throw ApiException.validation('รูปที่เลือกไม่ถูกต้อง');
          }
          const media = await tx.media.findFirst({
            where: { id: value },
            select: { id: true, status: true },
          });
          if (!media || media.status === 'trashed') {
            throw ApiException.validation('ไม่พบรูปที่เลือกในคลังสื่อ');
          }
        }
      }

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

    if (brandChanged) await this.publishJobs.enqueueChrome(siteId);

    const brand = await this.db.forSite(siteId, (tx) => resolveBrand(tx, site.settings));
    return toSummary(site, role, brand);
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

  /** A site may keep its own subdomain; only another site's is a conflict. */
  private async assertSubdomainFree(siteId: string, subdomain: string): Promise<void> {
    const taken = await this.db.site.findFirst({
      where: { subdomain, id: { not: siteId } },
      select: { id: true },
    });
    if (taken) throw ApiException.conflict('subdomain นี้ถูกใช้งานแล้ว');
  }
}

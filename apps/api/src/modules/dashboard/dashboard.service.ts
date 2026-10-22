import { Injectable } from '@nestjs/common';
import {
  HOME_SLUG,
  checklistStateSchema,
  siteChecklistLabel,
  SITE_CHECKLIST_LABELS,
  type ApiLocale,
  type ChecklistState,
  type DashboardMetric,
  type DashboardSummary,
  type HealthImpact,
  type SiteChecklistItem,
  type SiteChecklistKey,
  type SiteHealthIssue,
  type UpdateChecklistInput,
} from '@lumio/shared';
import { Prisma } from '@prisma/client';
import { ApiException } from '../../common/api-error';
import { AuditService } from '../audit/audit.service';
import { rootDomain } from '../public/host';
import { PrismaService } from '../prisma/prisma.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Start of the UTC day, so "today" is stable in tests and across time zones. */
const startOfUtcDay = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** Trend in percent, or `null` when there is no previous period to compare with. */
const changePercent = (value: number, previous: number): number | null => {
  if (previous <= 0) return null;
  return Math.round(((value - previous) / previous) * 1000) / 10;
};

const metric = (value: number, previous: number): DashboardMetric => ({
  value,
  previous,
  changePercent: changePercent(value, previous),
});

const impactFor = (penalty: number): HealthImpact => {
  if (penalty >= 15) return 'high';
  if (penalty >= 7) return 'medium';
  return 'low';
};

interface HealthCheck {
  penalty: number;
  issue: SiteHealthIssue;
}

/**
 * Everything the dashboard needs, derived from real data
 * (docs/design/05-admin-ia.md 5.2). Nothing here is read-only: each number has a
 * trend, each health issue links to the screen that fixes it, and each checklist
 * step links to where it is completed.
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async summary(siteId: string, locale: ApiLocale = 'th'): Promise<DashboardSummary> {
    return this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({
        where: { id: siteId },
        select: { id: true, name: true, subdomain: true, settings: true },
      });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');

      const settings = asRecord(site.settings);
      const now = new Date();
      const todayStart = startOfUtcDay(now);
      const tomorrowStart = new Date(todayStart.getTime() + DAY_MS);
      const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);

      const [
        publishedCount,
        pages,
        home,
        mediaReady,
        mediaMissingAlt,
        domainCount,
        submissionsToday,
        submissionsYesterday,
        subscribersToday,
        subscribersYesterday,
        visitorsToday,
        visitorsYesterday,
      ] = await Promise.all([
        tx.content.count({ where: { status: 'published' } }),
        tx.content.findMany({
          where: { type: 'page', status: 'published' },
          select: { id: true, title: true, seo: true },
          take: 100,
        }),
        tx.content.findFirst({
          where: { type: 'page', slug: HOME_SLUG },
          select: { id: true, revision: true },
        }),
        tx.media.count({ where: { status: 'ready' } }),
        tx.media.count({
          where: { status: 'ready', OR: [{ alt: null }, { alt: '' }] },
        }),
        tx.domain.count(),
        tx.formSubmission.count({ where: { createdAt: { gte: todayStart, lt: tomorrowStart } } }),
        tx.formSubmission.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
        tx.subscriber.count({ where: { createdAt: { gte: todayStart, lt: tomorrowStart } } }),
        tx.subscriber.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
        this.visitors(tx, todayStart, tomorrowStart),
        this.visitors(tx, yesterdayStart, todayStart),
      ]);

      const health = buildHealth(
        {
          publishedCount,
          pagesWithoutDescription: pages.filter((page) => {
            const seo = asRecord(page.seo);
            return typeof seo.description !== 'string' || seo.description.trim().length === 0;
          }),
          mediaMissingAlt,
          domainCount,
          hasLogo: typeof settings.logoMediaId === 'string',
        },
        locale,
      );

      const checklist = buildChecklist(
        {
          siteNamed: site.name.trim().length > 0,
          styleChosen: typeof settings.styleId === 'string',
          homeEdited: (home?.revision ?? 1) > 1,
          imageUploaded: mediaReady > 0,
          domainConnected: domainCount > 0,
          firstPublish: publishedCount > 0,
          dismissed: readChecklistState(site.settings).dismissed,
          homeId: home?.id ?? null,
        },
        locale,
      );

      return {
        site: {
          id: site.id,
          name: site.name,
          subdomain: site.subdomain,
          url: `https://${site.subdomain}.${rootDomain()}`,
          homeContentId: home?.id ?? null,
        },
        stats: {
          visitors: metric(visitorsToday, visitorsYesterday),
          submissions: metric(submissionsToday, submissionsYesterday),
          subscribers: metric(subscribersToday, subscribersYesterday),
        },
        health,
        checklist,
      };
    });
  }

  /** Hides the onboarding checklist for good (04-ux.md 4.1). */
  async updateChecklist(
    siteId: string,
    input: UpdateChecklistInput,
    actorId: string,
  ): Promise<ChecklistState> {
    return this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({ where: { id: siteId }, select: { settings: true } });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');

      const settings = asRecord(site.settings);
      const state: ChecklistState = { dismissed: input.dismissed };

      await tx.site.update({
        where: { id: siteId },
        data: {
          settings: {
            ...settings,
            checklist: state,
          } as Prisma.InputJsonObject,
        },
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'dashboard.checklist_update',
          target: siteId,
          meta: { dismissed: input.dismissed },
        },
      });

      return state;
    });
  }

  /**
   * Distinct visitors in a window. `pageviews` is partitioned and not modelled by
   * Prisma, so it is read with raw SQL; RLS still scopes it to the current site.
   */
  private async visitors(tx: Prisma.TransactionClient, from: Date, to: Date): Promise<number> {
    const rows = await tx.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT "session_hash")::bigint AS count
      FROM "pageviews"
      WHERE "ts" >= ${from} AND "ts" < ${to}
    `;
    return Number(rows[0]?.count ?? 0);
  }
}

const readChecklistState = (raw: unknown): ChecklistState => {
  const parsed = checklistStateSchema.safeParse(asRecord(raw).checklist);
  return parsed.success ? parsed.data : { dismissed: false };
};

interface HealthInput {
  publishedCount: number;
  pagesWithoutDescription: { id: string; title: string }[];
  mediaMissingAlt: number;
  domainCount: number;
  hasLogo: boolean;
}

/** Score plus the top three things to fix, ordered by impact. */
const buildHealth = (
  { publishedCount, pagesWithoutDescription, mediaMissingAlt, domainCount, hasLogo }: HealthInput,
  locale: ApiLocale = 'th',
): DashboardSummary['health'] => {
  const en = locale === 'en';
  const checks: HealthCheck[] = [];

  if (publishedCount === 0) {
    checks.push({
      penalty: 25,
      issue: {
        id: 'not_published',
        message: en
          ? 'Nothing is published yet. Publish so people can see your site.'
          : 'ยังไม่มีหน้าเว็บที่เผยแพร่ กดเผยแพร่เพื่อให้คนเห็นเว็บของคุณ',
        impact: 'high',
        href: '/content/page',
      },
    });
  }

  if (pagesWithoutDescription.length > 0) {
    const penalty = Math.min(6 * pagesWithoutDescription.length, 18);
    const first = pagesWithoutDescription[0]!;
    checks.push({
      penalty,
      issue: {
        id: 'seo_description',
        message: en
          ? pagesWithoutDescription.length === 1
            ? `Page "${first.title}" has no description`
            : `${pagesWithoutDescription.length} pages have no description`
          : pagesWithoutDescription.length === 1
            ? `หน้า "${first.title}" ยังไม่มีคำอธิบายหน้า`
            : `มี ${pagesWithoutDescription.length} หน้ายังไม่มีคำอธิบายหน้า`,
        impact: impactFor(penalty),
        href: `/content/page/${first.id}`,
      },
    });
  }

  if (mediaMissingAlt > 0) {
    const penalty = Math.min(3 * mediaMissingAlt, 12);
    checks.push({
      penalty,
      issue: {
        id: 'media_alt',
        message: en
          ? `${mediaMissingAlt} images have no description`
          : `รูป ${mediaMissingAlt} รูปยังไม่มีคำอธิบายรูป`,
        impact: impactFor(penalty),
        href: '/content/media',
      },
    });
  }

  if (domainCount === 0) {
    checks.push({
      penalty: 6,
      issue: {
        id: 'no_domain',
        message: en
          ? 'Your own domain is not connected yet, the site is still on a temporary address'
          : 'ยังไม่ได้เชื่อมโดเมนของตัวเอง เว็บยังอยู่บนที่อยู่ชั่วคราว',
        impact: 'low',
        href: '/settings/domain',
      },
    });
  }

  if (!hasLogo) {
    checks.push({
      penalty: 4,
      issue: {
        id: 'no_logo',
        message: en ? 'The logo has not been uploaded yet' : 'ยังไม่ได้อัปโหลดโลโก้',
        impact: 'low',
        href: '/design/style',
      },
    });
  }

  const penalty = checks.reduce((total, check) => total + check.penalty, 0);
  const issues = checks
    .slice()
    .sort((a, b) => b.penalty - a.penalty)
    .slice(0, 3)
    .map((check) => check.issue);

  return { score: Math.max(0, Math.min(100, 100 - penalty)), issues };
};

interface ChecklistInput {
  siteNamed: boolean;
  styleChosen: boolean;
  homeEdited: boolean;
  imageUploaded: boolean;
  domainConnected: boolean;
  firstPublish: boolean;
  dismissed: boolean;
  homeId: string | null;
}

const CHECKLIST_HREFS: Record<SiteChecklistKey, (homeId: string | null) => string> = {
  site_named: () => '/settings/general',
  style_chosen: () => '/design/style',
  home_text_edited: (homeId) => (homeId ? `/content/page/${homeId}` : '/content/page'),
  image_uploaded: () => '/content/media',
  domain_connected: () => '/settings/domain',
  first_publish: () => '/content/page',
};

const buildChecklist = (
  input: ChecklistInput,
  locale: ApiLocale = 'th',
): DashboardSummary['checklist'] => {
  const done: Record<SiteChecklistKey, boolean> = {
    site_named: input.siteNamed,
    style_chosen: input.styleChosen,
    home_text_edited: input.homeEdited,
    image_uploaded: input.imageUploaded,
    domain_connected: input.domainConnected,
    first_publish: input.firstPublish,
  };

  const items: SiteChecklistItem[] = (Object.keys(SITE_CHECKLIST_LABELS) as SiteChecklistKey[]).map(
    (key) => ({
      key,
      label: siteChecklistLabel(key, locale),
      done: done[key],
      href: CHECKLIST_HREFS[key](input.homeId),
    }),
  );

  const doneCount = items.filter((item) => item.done).length;
  return {
    items,
    doneCount,
    total: items.length,
    complete: doneCount === items.length,
    dismissed: input.dismissed,
  };
};

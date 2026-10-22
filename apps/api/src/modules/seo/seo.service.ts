import { Injectable } from '@nestjs/common';
import {
  blocksHaveHeadingOne,
  hasSeoText,
  isNoindex,
  seoGradeFor,
  seoIssueLabel,
  type ApiLocale,
  type BlockNode,
  type HealthImpact,
  type SeoCheck,
  type SeoHealth,
  type SeoIssueItem,
  type NotFoundList,
  type SeoIssueKind,
} from '@lumio/shared';
import { PrismaService } from '../prisma/prisma.service';

/** A page never lists more than this many examples, so the report stays readable. */
const MAX_ITEMS = 5;

/** How much each check costs, and how the cost turns into an impact label. */
const PENALTIES: Record<SeoIssueKind, (count: number) => number> = {
  not_published: () => 45,
  missing_title: (count) => Math.min(5 * count, 15),
  missing_description: (count) => Math.min(6 * count, 18),
  missing_h1: (count) => Math.min(4 * count, 12),
  missing_alt: (count) => Math.min(3 * count, 12),
  noindex: (count) => Math.min(2 * count, 6),
};

const HREFS: Record<SeoIssueKind, string> = {
  not_published: '/content/page',
  missing_title: '/content/page',
  missing_description: '/content/page',
  missing_h1: '/content/page',
  missing_alt: '/content/media',
  noindex: '/content/page',
};

const impactFor = (penalty: number): HealthImpact => {
  if (penalty >= 15) return 'high';
  if (penalty >= 7) return 'medium';
  return 'low';
};

interface ContentRow {
  id: string;
  title: string;
  seo: unknown;
  blocksPublished: unknown;
}

const asBlocks = (value: unknown): BlockNode[] =>
  Array.isArray(value) ? (value as BlockNode[]) : [];

const itemsFor = (rows: { id: string; title: string }[], count: number): SeoIssueItem[] =>
  rows.slice(0, Math.min(count, MAX_ITEMS));

const toItem = (row: ContentRow): SeoIssueItem => ({ id: row.id, title: row.title });

/**
 * SEO health for one site (docs/design/14-seo-performance.md 14.1). Every number
 * comes from the stored pages, media and SEO fields, and each failing check links
 * to the screen that fixes it, so the report is never read-only.
 */
@Injectable()
export class SeoService {
  constructor(private readonly db: PrismaService) {}

  async health(siteId: string, locale: ApiLocale = 'th'): Promise<SeoHealth> {
    const { publishedCount, rows, mediaMissingAlt } = await this.db.forSite(siteId, async (tx) => {
      const publishedCount = await tx.content.count({ where: { status: 'published' } });
      const rows = await tx.content.findMany({
        where: { status: 'published' },
        select: { id: true, title: true, seo: true, blocksPublished: true },
        orderBy: [{ updatedAt: 'desc' }],
        take: 200,
      });
      const mediaMissingAlt = await tx.media.findMany({
        where: { status: 'ready', OR: [{ alt: null }, { alt: '' }] },
        select: { id: true, filename: true },
        orderBy: [{ createdAt: 'desc' }],
        take: MAX_ITEMS,
      });
      return { publishedCount, rows, mediaMissingAlt };
    });

    const missingTitle = rows.filter((row) => !hasSeoText(row.seo, 'title'));
    const missingDescription = rows.filter((row) => !hasSeoText(row.seo, 'description'));
    const missingH1 = rows.filter((row) => !blocksHaveHeadingOne(asBlocks(row.blocksPublished)));
    const noindex = rows.filter((row) => isNoindex(row.seo));

    const checks: SeoCheck[] = [
      this.check('not_published', publishedCount === 0 ? 1 : 0, [], locale),
      this.check('missing_title', missingTitle.length, missingTitle.map(toItem), locale),
      this.check(
        'missing_description',
        missingDescription.length,
        missingDescription.map(toItem),
        locale,
      ),
      this.check('missing_h1', missingH1.length, missingH1.map(toItem), locale),
      this.check(
        'missing_alt',
        mediaMissingAlt.length,
        mediaMissingAlt.map((media) => ({
          id: media.id,
          title: media.filename ?? (locale === 'en' ? 'Untitled image' : 'รูปที่ไม่มีชื่อ'),
        })),
        locale,
      ),
      this.check('noindex', noindex.length, noindex.map(toItem), locale),
    ];

    const penalty = checks.reduce(
      (total, entry) => total + (entry.count > 0 ? PENALTIES[entry.kind](entry.count) : 0),
      0,
    );
    const score = Math.max(0, Math.min(100, 100 - penalty));

    return { score, grade: seoGradeFor(score), publishedCount, checks };
  }


  /**
   * The loudest 404s of the last 30 days, ready for the redirect manager
   * (docs/design/14-seo-performance.md 14.1). Counts are per address so one
   * broken campaign link does not hide the rest.
   */
  async notFound(siteId: string): Promise<NotFoundList> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [rows, total] = await this.db.forSite(siteId, async (tx) => {
      const items = await tx.notFound.findMany({
        where: { siteId, lastSeenAt: { gte: since } },
        orderBy: [{ hits: 'desc' }, { lastSeenAt: 'desc' }],
        take: 20,
      });
      const sum = await tx.notFound.aggregate({
        where: { siteId, lastSeenAt: { gte: since } },
        _sum: { hits: true },
      });
      return [items, sum._sum.hits ?? 0];
    });

    return {
      total,
      items: rows.map((row) => ({
        path: row.path,
        hits: row.hits,
        lastSeenAt: row.lastSeenAt.toISOString(),
      })),
    };
  }

  private check(
    kind: SeoIssueKind,
    count: number,
    items: SeoIssueItem[],
    locale: ApiLocale = 'th',
  ): SeoCheck {
    const penalty = count > 0 ? PENALTIES[kind](count) : 0;
    return {
      kind,
      label: seoIssueLabel(kind, locale),
      done: count === 0,
      count,
      impact: impactFor(penalty),
      href: HREFS[kind],
      items: itemsFor(items, count),
    };
  }
}

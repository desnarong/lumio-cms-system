import { describe, expect, it, vi, type Mock } from 'vitest';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const USER_ID = '00000000-0000-4000-8000-000000000001';
const HOME_ID = '00000000-0000-4000-8000-0000000000c1';

interface Stubs {
  db: PrismaService;
  siteUpdate: Mock;
  auditLogCreate: Mock;
}

interface Options {
  settings?: Record<string, unknown>;
  publishedCount?: number;
  pages?: { id: string; title: string; seo: Record<string, unknown> }[];
  home?: { id: string; revision: number } | null;
  mediaReady?: number;
  mediaMissingAlt?: number;
  domains?: number;
  submissions?: [number, number];
  subscribers?: [number, number];
  visitors?: [number, number];
}

const stubs = (options: Options = {}): Stubs => {
  const siteUpdate = vi.fn().mockResolvedValue({});
  const auditLogCreate = vi.fn().mockResolvedValue({});

  const countFor = (values: [number, number]): Mock => {
    const mock = vi.fn();
    mock.mockResolvedValueOnce(values[0]).mockResolvedValueOnce(values[1]);
    return mock;
  };

  const queryRaw = vi.fn();
  const [visitorsToday, visitorsYesterday] = options.visitors ?? [3, 2];
  queryRaw
    .mockResolvedValueOnce([{ count: BigInt(visitorsToday) }])
    .mockResolvedValueOnce([{ count: BigInt(visitorsYesterday) }]);

  const tx = {
    site: {
      findUnique: vi.fn().mockResolvedValue({
        id: SITE_ID,
        name: 'กาแฟบ้านดอย',
        subdomain: 'baandoi',
        settings: options.settings ?? { styleId: 'soft', logoMediaId: 'logo-1' },
      }),
      update: siteUpdate,
    },
    content: {
      count: vi.fn().mockResolvedValue(options.publishedCount ?? 3),
      findMany: vi.fn().mockResolvedValue(options.pages ?? []),
      findFirst: vi
        .fn()
        .mockResolvedValue(
          options.home === undefined ? { id: HOME_ID, revision: 2 } : options.home,
        ),
    },
    media: { count: countFor([options.mediaReady ?? 4, options.mediaMissingAlt ?? 0]) },
    domain: { count: vi.fn().mockResolvedValue(options.domains ?? 1) },
    formSubmission: { count: countFor(options.submissions ?? [7, 5]) },
    subscriber: { count: countFor(options.subscribers ?? [2, 4]) },
    auditLog: { create: auditLogCreate },
    $queryRaw: queryRaw,
  };

  const db = {
    forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx)),
  } as unknown as PrismaService;

  return { db, siteUpdate, auditLogCreate };
};

const service = (all: Stubs): DashboardService =>
  new DashboardService(all.db, {
    log: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuditService);

describe('DashboardService', () => {
  it('summarises stats with a trend and a public url', async () => {
    const summary = await service(stubs()).summary(SITE_ID);

    expect(summary.site).toMatchObject({
      name: 'กาแฟบ้านดอย',
      url: 'https://baandoi.lumio.app',
      homeContentId: HOME_ID,
    });
    expect(summary.stats.visitors).toEqual({ value: 3, previous: 2, changePercent: 50 });
    expect(summary.stats.submissions).toEqual({ value: 7, previous: 5, changePercent: 40 });
    // Fewer subscribers than yesterday reads as a fall, not a crash.
    expect(summary.stats.subscribers.changePercent).toBe(-50);
  });

  it('answers the checklist and health issues in the requested language', async () => {
    const summary = await service(stubs({ domains: 0, mediaMissingAlt: 2 })).summary(SITE_ID, 'en');

    expect(summary.checklist.items.find((item) => item.key === 'site_named')?.label).toBe(
      'Name the site',
    );
    expect(summary.health.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining(['2 images have no description']),
    );
  });

  it('reports no trend when there is no baseline to compare with', async () => {
    const summary = await service(stubs({ visitors: [0, 0], submissions: [0, 0] })).summary(
      SITE_ID,
    );
    expect(summary.stats.visitors.changePercent).toBeNull();
  });

  it('marks every checklist step done on a finished site and hides the score hits', async () => {
    const summary = await service(
      stubs({
        publishedCount: 5,
        pages: [{ id: HOME_ID, title: 'หน้าแรก', seo: { description: 'กาแฟคั่วสด' } }],
        home: { id: HOME_ID, revision: 4 },
        mediaReady: 6,
        mediaMissingAlt: 0,
        domains: 1,
      }),
    ).summary(SITE_ID);

    expect(summary.checklist.complete).toBe(true);
    expect(summary.checklist.doneCount).toBe(summary.checklist.total);
    expect(summary.health.score).toBe(100);
    expect(summary.health.issues).toEqual([]);
  });

  it('turns missing SEO, alt text and a domain into ordered things to fix', async () => {
    const summary = await service(
      stubs({
        publishedCount: 2,
        pages: [
          { id: HOME_ID, title: 'หน้าแรก', seo: {} },
          { id: 'page-2', title: 'บริการ', seo: {} },
          { id: 'page-3', title: 'ติดต่อ', seo: {} },
        ],
        mediaMissingAlt: 4,
        domains: 0,
        settings: { styleId: 'soft' },
      }),
    ).summary(SITE_ID);

    expect(summary.health.score).toBeLessThan(100);
    expect(summary.health.issues.length).toBeLessThanOrEqual(3);
    // The heaviest penalty (three pages missing a description) comes first.
    expect(summary.health.issues[0]).toMatchObject({ id: 'seo_description', impact: 'high' });
    expect(summary.health.issues.map((issue) => issue.id)).toContain('media_alt');
    expect(summary.health.issues.map((issue) => issue.id)).toContain('no_domain');
    expect(summary.checklist.items.find((item) => item.key === 'first_publish')?.done).toBe(true);
  });

  it('flags an empty site as not published with a high-impact issue', async () => {
    const summary = await service(stubs({ publishedCount: 0, home: null })).summary(SITE_ID);

    expect(summary.health.issues[0]).toMatchObject({ id: 'not_published', impact: 'high' });
    expect(summary.checklist.items.find((item) => item.key === 'first_publish')?.done).toBe(false);
    expect(summary.checklist.items.find((item) => item.key === 'home_text_edited')?.href).toBe(
      '/content/page',
    );
  });

  it('keeps the dismissed flag the site already stored', async () => {
    const summary = await service(
      stubs({ settings: { styleId: 'soft', checklist: { dismissed: true } } }),
    ).summary(SITE_ID);

    expect(summary.checklist.dismissed).toBe(true);
  });

  it('stores the dismissal and writes an audit log', async () => {
    const all = stubs({ settings: { styleId: 'soft' } });

    const state = await service(all).updateChecklist(SITE_ID, { dismissed: true }, USER_ID);

    expect(state).toEqual({ dismissed: true });
    expect(all.siteUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: SITE_ID },
        data: expect.objectContaining({ settings: expect.objectContaining({ styleId: 'soft' }) }),
      }),
    );
    expect(all.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'dashboard.checklist_update' }),
      }),
    );
  });
});

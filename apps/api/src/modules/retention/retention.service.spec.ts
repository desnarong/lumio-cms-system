import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { PublicService } from '../public/public.service';
import { RetentionScheduler } from './retention.scheduler';
import { RetentionService } from './retention.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const NOW = new Date('2026-11-06T12:00:00Z');

interface NotFoundRow {
  id: string;
  siteId: string;
  path: string;
  hits: number;
  lastSeenAt: Date;
}

/** Just enough of the `not_found` delegate to exercise the cap and the sweep. */
const notFoundTable = (rows: NotFoundRow[]) => ({
  rows,
  updateMany: vi.fn(async ({ where }: { where: { path: string } }) => {
    const hit = rows.filter((row) => row.path === where.path);
    for (const row of hit) {
      row.hits += 1;
      row.lastSeenAt = NOW;
    }
    return { count: hit.length };
  }),
  count: vi.fn(async () => rows.length),
  upsert: vi.fn(async ({ create }: { create: Omit<NotFoundRow, 'id'> }) => {
    const row = { id: `nf-${rows.length + 1}`, ...create };
    rows.push(row);
    return row;
  }),
  deleteMany: vi.fn(
    async ({ where }: { where: { lastSeenAt?: { lt: Date }; id?: { in: string[] } } }) => {
      const doomed = rows.filter((row) =>
        where.lastSeenAt ? row.lastSeenAt < where.lastSeenAt.lt : where.id?.in.includes(row.id),
      );
      for (const row of doomed) rows.splice(rows.indexOf(row), 1);
      return { count: doomed.length };
    },
  ),
  findMany: vi.fn(async ({ skip }: { skip: number }) =>
    [...rows]
      .sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime() || b.hits - a.hits)
      .slice(skip)
      .map((row) => ({ id: row.id })),
  ),
});

const fakeDb = (rows: NotFoundRow[]) => {
  const notFound = notFoundTable(rows);
  const db = {
    domain: { findUnique: vi.fn(async () => null) },
    site: {
      findUnique: vi.fn(async () => ({ id: SITE_ID, subdomain: 'baandoi' })),
      findMany: vi.fn(async () => [{ id: SITE_ID }]),
    },
    forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => Promise<unknown>) =>
      fn({ notFound }),
    ),
  };
  return { db: db as unknown as PrismaService, notFound };
};

const row = (index: number, daysAgo: number, hits = 1): NotFoundRow => ({
  id: `nf-${index}`,
  siteId: SITE_ID,
  path: `/old-${index}`,
  hits,
  lastSeenAt: new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000),
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('PublicService.recordNotFound cap', () => {
  it('counts a known address even when the site is full', async () => {
    vi.stubEnv('NOT_FOUND_MAX_PER_SITE', '10');
    const rows = Array.from({ length: 10 }, (_, index) => row(index, 1));
    const { db, notFound } = fakeDb(rows);

    await new PublicService(db).recordNotFound('baandoi.example.com', '/old-3');

    expect(rows.find((item) => item.path === '/old-3')?.hits).toBe(2);
    expect(notFound.upsert).not.toHaveBeenCalled();
  });

  it('stops recording new addresses once the site holds the maximum', async () => {
    vi.stubEnv('NOT_FOUND_MAX_PER_SITE', '10');
    const rows = Array.from({ length: 10 }, (_, index) => row(index, 1));
    const { db, notFound } = fakeDb(rows);

    await new PublicService(db).recordNotFound('baandoi.example.com', '/wp-admin.php');

    expect(rows).toHaveLength(10);
    expect(notFound.upsert).not.toHaveBeenCalled();
  });

  it('records a new address while there is room', async () => {
    const rows: NotFoundRow[] = [];
    const { db } = fakeDb(rows);

    await new PublicService(db).recordNotFound('baandoi.example.com', '/menu-old');

    expect(rows.map((item) => item.path)).toEqual(['/menu-old']);
  });
});

describe('RetentionService.pruneNotFound', () => {
  it('forgets addresses unseen past the window', async () => {
    vi.stubEnv('NOT_FOUND_RETENTION_DAYS', '90');
    const rows = [row(1, 10), row(2, 91), row(3, 400)];
    const { db } = fakeDb(rows);

    const summary = await new RetentionService(db).pruneNotFound(NOW);

    expect(summary).toEqual({ sites: 1, removed: 2 });
    expect(rows.map((item) => item.id)).toEqual(['nf-1']);
  });

  it('trims a full site to its most recently seen addresses', async () => {
    vi.stubEnv('NOT_FOUND_MAX_PER_SITE', '10');
    const rows = Array.from({ length: 13 }, (_, index) => row(index, index));
    const { db } = fakeDb(rows);

    const summary = await new RetentionService(db).pruneNotFound(NOW);

    expect(summary.removed).toBe(3);
    expect(rows.map((item) => item.id)).toEqual(
      Array.from({ length: 10 }, (_, index) => `nf-${index}`),
    );
  });
});

describe('RetentionScheduler', () => {
  it('skips a pass while the previous one is still running', async () => {
    let release: () => void = () => undefined;
    const sweep = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const scheduler = new RetentionScheduler({ sweep } as unknown as RetentionService);

    const first = scheduler.runOnce(NOW);
    expect(await scheduler.runOnce(NOW)).toBe(false);
    release();
    expect(await first).toBe(true);
    expect(sweep).toHaveBeenCalledTimes(1);
  });

  it('keeps going when one half of the sweep fails', async () => {
    const { db } = fakeDb([row(1, 400)]);
    const service = new RetentionService(db);
    vi.spyOn(service, 'maintainPageviewPartitions').mockRejectedValue(new Error('no privilege'));

    await service.sweep(NOW);

    expect(db.forSite).toHaveBeenCalled();
  });
});

describe('RetentionService.purgeDeleted', () => {
  it('hard-deletes only rows deleted before the trash window', async () => {
    vi.stubEnv('TRASH_RETENTION_DAYS', '30');
    const deleteMany = () => vi.fn().mockResolvedValue({ count: 1 });
    const tx = {
      promotion: { deleteMany: deleteMany() },
      bookingService: { deleteMany: deleteMany() },
      form: { deleteMany: deleteMany() },
      membershipPlan: { deleteMany: deleteMany() },
    };
    const db = {
      site: { findMany: vi.fn(async () => [{ id: SITE_ID }]) },
      forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => Promise<unknown>) => fn(tx)),
    } as unknown as PrismaService;

    const summary = await new RetentionService(db).purgeDeleted(NOW);

    const cutoff = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000);
    for (const table of Object.values(tx)) {
      expect(table.deleteMany).toHaveBeenCalledWith({
        where: { siteId: SITE_ID, deletedAt: { lt: cutoff } },
      });
    }
    expect(summary).toEqual({
      sites: 1,
      promotions: 1,
      bookingServices: 1,
      forms: 1,
      membershipPlans: 1,
    });
  });
});

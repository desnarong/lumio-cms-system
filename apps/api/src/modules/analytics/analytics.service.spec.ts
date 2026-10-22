import { describe, expect, it, vi, type Mock } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';

const utcDayStart = (offsetDays = 0): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays));
};

interface Stubs {
  db: PrismaService;
  queryRaw: Mock;
}

const stubs = (
  options: {
    totals?: { visitors: number; pageviews: number };
    previousVisitors?: number;
    series?: { day: Date; visitors: number; pageviews: number }[];
    topPages?: { label: string; value: number }[];
    topReferrers?: { label: string; value: number }[];
    devices?: { label: string; value: number }[];
  } = {},
): Stubs => {
  const queryRaw = vi.fn();
  const totals = options.totals ?? { visitors: 0, pageviews: 0 };
  queryRaw
    .mockResolvedValueOnce([
      { visitors: BigInt(totals.visitors), pageviews: BigInt(totals.pageviews) },
    ])
    .mockResolvedValueOnce([{ visitors: BigInt(options.previousVisitors ?? 0) }])
    .mockResolvedValueOnce(
      (options.series ?? []).map((row) => ({
        day: row.day,
        visitors: BigInt(row.visitors),
        pageviews: BigInt(row.pageviews),
      })),
    )
    .mockResolvedValueOnce(
      (options.topPages ?? []).map((row) => ({ label: row.label, value: BigInt(row.value) })),
    )
    .mockResolvedValueOnce(
      (options.topReferrers ?? []).map((row) => ({ label: row.label, value: BigInt(row.value) })),
    )
    .mockResolvedValueOnce(
      (options.devices ?? []).map((row) => ({ label: row.label, value: BigInt(row.value) })),
    );

  const db = {
    forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) =>
      fn({ $queryRaw: queryRaw }),
    ),
  } as unknown as PrismaService;

  return { db, queryRaw };
};

describe('AnalyticsService', () => {
  it('summarises a range with totals, a trend and a full series', async () => {
    const { db } = stubs({
      totals: { visitors: 240, pageviews: 500 },
      previousVisitors: 200,
      series: [{ day: utcDayStart(), visitors: 30, pageviews: 70 }],
    });

    const summary = await new AnalyticsService(db).summary(SITE_ID, '7d');

    expect(summary.range).toBe('7d');
    expect(summary.days).toBe(7);
    expect(summary.visitors).toBe(240);
    expect(summary.pageviews).toBe(500);
    expect(summary.changePercent).toBe(20);
    // Sparse rows are filled so the chart always has one bar per day.
    expect(summary.series).toHaveLength(7);
    expect(summary.series[6]).toMatchObject({ visitors: 30, pageviews: 70 });
    expect(summary.series[0]?.visitors).toBe(0);
  });

  it('returns zeros and no trend when the site has no visits yet', async () => {
    const { db } = stubs();
    const summary = await new AnalyticsService(db).summary(SITE_ID, '30d');

    expect(summary.visitors).toBe(0);
    expect(summary.changePercent).toBeNull();
    expect(summary.series).toHaveLength(30);
    expect(summary.topPages).toEqual([]);
  });

  it('shortens a referrer to its host and labels devices', async () => {
    const { db } = stubs({
      topReferrers: [{ label: 'https://www.google.com/search?q=lumio', value: 12 }],
      devices: [{ label: 'mobile', value: 40 }],
    });

    const summary = await new AnalyticsService(db).summary(SITE_ID, '7d');

    expect(summary.topReferrers[0]).toEqual({ label: 'www.google.com', value: 12 });
    expect(summary.devices[0]).toEqual({ label: 'มือถือ', value: 40 });
  });

  it('labels devices in English when asked', async () => {
    const { db } = stubs({ devices: [{ label: 'mobile', value: 40 }] });
    const summary = await new AnalyticsService(db).summary(SITE_ID, '7d', 'en');
    expect(summary.devices[0]).toEqual({ label: 'Mobile', value: 40 });
  });

  it('keeps a raw referrer that is not a URL', async () => {
    const { db } = stubs({ topReferrers: [{ label: 'line', value: 3 }] });
    const summary = await new AnalyticsService(db).summary(SITE_ID, '7d');
    expect(summary.topReferrers[0]).toEqual({ label: 'line', value: 3 });
  });
});

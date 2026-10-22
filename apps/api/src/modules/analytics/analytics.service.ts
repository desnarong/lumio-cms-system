import { Injectable } from '@nestjs/common';
import {
  analyticsChangePercent,
  analyticsRangeDays,
  deviceLabel,
  type AnalyticsPoint,
  type AnalyticsRange,
  type AnalyticsRow,
  type AnalyticsSummary,
  type ApiLocale,
} from '@lumio/shared';
import { PrismaService } from '../prisma/prisma.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Start of the UTC day, so day buckets are stable across time zones. */
const startOfUtcDay = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const dayKey = (date: Date): string => date.toISOString().slice(0, 10);

/** Turns a stored referrer into a short host label; falls back to the raw value. */
const referrerLabel = (value: string): string => {
  try {
    return new URL(value).hostname || value;
  } catch {
    return value;
  }
};

interface CountRow {
  visitors: bigint;
  pageviews: bigint;
}

/**
 * Visitor analytics for one site (docs/design/05-admin-ia.md "เติบโต › Analytics").
 * `pageviews` is partitioned and not modelled by Prisma, so it is read with raw
 * SQL; RLS still scopes every row to the current site.
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly db: PrismaService) {}

  async summary(
    siteId: string,
    range: AnalyticsRange,
    locale: ApiLocale = 'th',
  ): Promise<AnalyticsSummary> {
    const days = analyticsRangeDays(range);
    const todayStart = startOfUtcDay(new Date());
    const from = new Date(todayStart.getTime() - (days - 1) * DAY_MS);
    const to = new Date(todayStart.getTime() + DAY_MS);
    const previousFrom = new Date(from.getTime() - days * DAY_MS);

    const data = await this.db.forSite(siteId, async (tx) => {
      const totals = await tx.$queryRaw<CountRow[]>`
        SELECT COUNT(DISTINCT "session_hash")::bigint AS visitors, COUNT(*)::bigint AS pageviews
        FROM "pageviews"
        WHERE "ts" >= ${from} AND "ts" < ${to}
      `;
      const previous = await tx.$queryRaw<{ visitors: bigint }[]>`
        SELECT COUNT(DISTINCT "session_hash")::bigint AS visitors
        FROM "pageviews"
        WHERE "ts" >= ${previousFrom} AND "ts" < ${from}
      `;
      const series = await tx.$queryRaw<{ day: Date; visitors: bigint; pageviews: bigint }[]>`
        SELECT date_trunc('day', "ts") AS day,
               COUNT(DISTINCT "session_hash")::bigint AS visitors,
               COUNT(*)::bigint AS pageviews
        FROM "pageviews"
        WHERE "ts" >= ${from} AND "ts" < ${to}
        GROUP BY 1
        ORDER BY 1
      `;
      const topPages = await tx.$queryRaw<{ label: string; value: bigint }[]>`
        SELECT "path" AS label, COUNT(*)::bigint AS value
        FROM "pageviews"
        WHERE "ts" >= ${from} AND "ts" < ${to}
        GROUP BY 1
        ORDER BY 2 DESC, 1 ASC
        LIMIT 5
      `;
      const topReferrers = await tx.$queryRaw<{ label: string; value: bigint }[]>`
        SELECT "referrer" AS label, COUNT(*)::bigint AS value
        FROM "pageviews"
        WHERE "ts" >= ${from} AND "ts" < ${to} AND "referrer" IS NOT NULL AND "referrer" <> ''
        GROUP BY 1
        ORDER BY 2 DESC, 1 ASC
        LIMIT 5
      `;
      const devices = await tx.$queryRaw<{ label: string; value: bigint }[]>`
        SELECT COALESCE(NULLIF("device", ''), 'unknown') AS label, COUNT(*)::bigint AS value
        FROM "pageviews"
        WHERE "ts" >= ${from} AND "ts" < ${to}
        GROUP BY 1
        ORDER BY 2 DESC, 1 ASC
        LIMIT 6
      `;
      return { totals, previous, series, topPages, topReferrers, devices };
    });

    const visitors = Number(data.totals[0]?.visitors ?? 0);
    const pageviews = Number(data.totals[0]?.pageviews ?? 0);
    const previousVisitors = Number(data.previous[0]?.visitors ?? 0);

    return {
      range,
      days,
      visitors,
      pageviews,
      previousVisitors,
      changePercent: analyticsChangePercent(visitors, previousVisitors),
      series: fillSeries(data.series, from, days),
      topPages: data.topPages.map((row) => ({ label: row.label, value: Number(row.value) })),
      topReferrers: data.topReferrers.map<AnalyticsRow>((row) => ({
        label: referrerLabel(row.label),
        value: Number(row.value),
      })),
      devices: data.devices.map((row) => ({
        label: deviceLabel(row.label, locale),
        value: Number(row.value),
      })),
    };
  }
}

/** Turns sparse daily rows into one point per day, filling quiet days with zeros. */
const fillSeries = (
  rows: { day: Date; visitors: bigint; pageviews: bigint }[],
  from: Date,
  days: number,
): AnalyticsPoint[] => {
  const byDay = new Map<string, { visitors: number; pageviews: number }>();
  for (const row of rows) {
    byDay.set(dayKey(row.day), {
      visitors: Number(row.visitors),
      pageviews: Number(row.pageviews),
    });
  }

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(from.getTime() + index * DAY_MS);
    const key = dayKey(date);
    const point = byDay.get(key);
    return {
      date: key,
      visitors: point?.visitors ?? 0,
      pageviews: point?.pageviews ?? 0,
    };
  });
};

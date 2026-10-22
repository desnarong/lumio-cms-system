import { z } from 'zod';
import type { ApiLocale } from './api-locale.js';

/**
 * Visitor analytics for one site (docs/design/05-admin-ia.md "เติบโต › Analytics").
 * The numbers come from the `pageviews` table, so the screen can show a trend and
 * where visitors came from instead of a single read-only figure.
 */

export const ANALYTICS_RANGES = ['7d', '30d'] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

/** How many days each range covers; the previous window is compared against it. */
export const ANALYTICS_RANGE_DAYS: Record<AnalyticsRange, number> = {
  '7d': 7,
  '30d': 30,
};

export const ANALYTICS_RANGE_LABELS: Record<AnalyticsRange, string> = {
  '7d': '7 วันล่าสุด',
  '30d': '30 วันล่าสุด',
};

export const analyticsRangeDays = (range: AnalyticsRange): number => ANALYTICS_RANGE_DAYS[range];

export const analyticsQuerySchema = z.object({
  range: z.enum(ANALYTICS_RANGES).default('7d'),
});
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

/** One day on the trend line; days with no visits are filled with zeros. */
export const analyticsPointSchema = z.object({
  /** `YYYY-MM-DD` in UTC. */
  date: z.string(),
  visitors: z.number().int().nonnegative(),
  pageviews: z.number().int().nonnegative(),
});
export type AnalyticsPoint = z.infer<typeof analyticsPointSchema>;

/** A labelled bar in the "top pages / sources / devices" lists. */
export const analyticsRowSchema = z.object({
  label: z.string(),
  value: z.number().int().nonnegative(),
});
export type AnalyticsRow = z.infer<typeof analyticsRowSchema>;

export const analyticsSummarySchema = z.object({
  range: z.enum(ANALYTICS_RANGES),
  days: z.number().int().positive(),
  visitors: z.number().int().nonnegative(),
  pageviews: z.number().int().nonnegative(),
  previousVisitors: z.number().int().nonnegative(),
  /** `null` when there is no baseline yet, so the UI hides the %. */
  changePercent: z.number().nullable(),
  series: z.array(analyticsPointSchema),
  topPages: z.array(analyticsRowSchema),
  topReferrers: z.array(analyticsRowSchema),
  devices: z.array(analyticsRowSchema),
});
export type AnalyticsSummary = z.infer<typeof analyticsSummarySchema>;

/** Trend in percent, or `null` when there is no previous period to compare with. */
export const analyticsChangePercent = (value: number, previous: number): number | null => {
  if (previous <= 0) return null;
  return Math.round(((value - previous) / previous) * 1000) / 10;
};

export const ANALYTICS_DEVICE_LABELS: Record<string, string> = {
  desktop: 'คอมพิวเตอร์',
  mobile: 'มือถือ',
  tablet: 'แท็บเล็ต',
};

export const ANALYTICS_DEVICE_LABELS_EN: Record<string, string> = {
  desktop: 'Desktop',
  mobile: 'Mobile',
  tablet: 'Tablet',
};

/** Falls back to a human label when a device value is missing or unknown. */
export const deviceLabel = (
  device: string | null | undefined,
  locale: ApiLocale = 'th',
): string => {
  const labels = locale === 'en' ? ANALYTICS_DEVICE_LABELS_EN : ANALYTICS_DEVICE_LABELS;
  if (!device) return locale === 'en' ? 'Unknown device' : 'ไม่ทราบอุปกรณ์';
  return labels[device] ?? device;
};

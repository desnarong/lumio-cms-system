import { z } from 'zod';

/**
 * 404 monitor (docs/design/14-seo-performance.md 14.1 "Redirect manager + แจ้งเตือน
 * ลิงก์เสีย"). The renderer reports a visible 404 with the address it tried, the
 * API counts it per site, and the SEO screen lists the worst offenders so the
 * owner can add a redirect.
 */

const MAX_PATH = 500;

/**
 * Only the path is kept: query strings and fragments are dropped so tracking
 * parameters do not create a new row for every visitor.
 */
export const normalizeNotFoundPath = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  const withoutOrigin = trimmed.replace(/^https?:\/\/[^/]+/i, '');
  const pathOnly = withoutOrigin.split(/[?#]/)[0] ?? '';
  if (pathOnly.length === 0) return '/';

  const withSlash = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
  const collapsed = withSlash.replace(/\/{2,}/g, '/').slice(0, MAX_PATH);
  return /^[\x20-\x7E\u00A0-\uFFFF/%._~-]+$/.test(collapsed) ? collapsed : null;
};

export const notFoundReportSchema = z.object({
  path: z.string().trim().min(1).max(MAX_PATH),
});
export type NotFoundReport = z.infer<typeof notFoundReportSchema>;

export const notFoundEntrySchema = z.object({
  path: z.string(),
  hits: z.number().int().nonnegative(),
  lastSeenAt: z.string(),
});
export type NotFoundEntry = z.infer<typeof notFoundEntrySchema>;

export const notFoundListSchema = z.object({
  items: z.array(notFoundEntrySchema),
  /** Every hit in the window, not just the listed paths. */
  total: z.number().int().nonnegative(),
});
export type NotFoundList = z.infer<typeof notFoundListSchema>;

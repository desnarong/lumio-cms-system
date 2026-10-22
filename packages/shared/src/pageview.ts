import { z } from 'zod';

/**
 * Visit tracking for the public site (docs/design/11-data-model.md `pageviews`,
 * 15-security.md 15.3). The renderer sends a tiny beacon per page view; the API
 * turns it into one privacy-friendly row: no full IP is stored, only a rotating
 * session hash that lets the analytics screen count unique visitors.
 */

export const PAGEVIEW_DEVICES = ['desktop', 'mobile', 'tablet'] as const;
export type PageviewDevice = (typeof PAGEVIEW_DEVICES)[number];

/** What the renderer beacon sends. Everything else is derived on the server. */
export const pageviewInputSchema = z.object({
  /** Path of the visited page, e.g. `/services`. */
  path: z.string().trim().min(1).max(300),
  /** Full referrer the browser reported; optional. */
  referrer: z.string().trim().max(500).optional(),
  /**
   * Random id the renderer keeps per browser tab, so repeat views in one visit
   * count as one visitor without ever identifying the person.
   */
  visitorId: z.string().trim().max(80).optional(),
});
export type PageviewInput = z.infer<typeof pageviewInputSchema>;

/** Keeps a stored path a clean, bounded site-relative route. */
export const normalizeTrackingPath = (raw: string): string => {
  const withoutOrigin = raw.trim().replace(/^https?:\/\/[^/]+/i, '');
  const path = withoutOrigin.split(/[?#]/)[0]?.trim() ?? '';
  const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
  const collapsed = withLeadingSlash.replace(/\/{2,}/g, '/');
  return collapsed.slice(0, 300) || '/';
};

/** Keeps a stored referrer a bounded value, or `undefined` when it is junk. */
export const normalizeTrackingReferrer = (raw: string | undefined): string | undefined => {
  const value = raw?.trim();
  return value && value.length > 0 ? value.slice(0, 500) : undefined;
};

/**
 * Coarse device class from the user agent. The analytics screen groups by these
 * three labels, so anything that is not clearly a phone or a tablet is a desktop.
 */
export const deviceFromUserAgent = (userAgent: string | null | undefined): PageviewDevice => {
  const ua = (userAgent ?? '').toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(ua)) return 'tablet';
  if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini/.test(ua)) return 'mobile';
  return 'desktop';
};

/**
 * Batched beacons for edge deliveries (docs/design/14-seo-performance.md): when
 * the public site is served as static files from a CDN, the edge keeps the
 * requests and posts them in one go instead of booting the renderer for each
 * visit. The API accepts at most 100 events per call, which keeps one request
 * cheap while still letting a busy edge flush quickly.
 */
export const PAGEVIEW_BATCH_MAX = 100;

/**
 * One edge event carries the device and country the CDN already knows, so a
 * batch from many visitors keeps each row accurate without a request each.
 */
export const pageviewEdgeEventSchema = pageviewInputSchema.extend({
  userAgent: z.string().trim().max(500).optional(),
  country: z.string().trim().max(8).optional(),
});
export type PageviewEdgeEvent = z.infer<typeof pageviewEdgeEventSchema>;

export const pageviewBatchInputSchema = z.object({
  events: z.array(pageviewEdgeEventSchema).min(1).max(PAGEVIEW_BATCH_MAX),
});
export type PageviewBatchInput = z.infer<typeof pageviewBatchInputSchema>;

/** Header the edge/worker sends; the value must match `EDGE_COLLECT_TOKEN`. */
export const PAGEVIEW_EDGE_TOKEN_HEADER = 'x-lumio-edge-token';

/** Country headers CDNs set; the first non-empty one wins. */
export const PAGEVIEW_COUNTRY_HEADERS = [
  'cf-ipcountry',
  'x-vercel-ip-country',
  'x-lumio-country',
] as const;

/** Client IP headers an edge can forward when it is not a trusted proxy. */
export const PAGEVIEW_IP_HEADERS = ['cf-connecting-ip', 'x-real-ip', 'x-client-ip'] as const;

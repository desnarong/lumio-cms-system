/**
 * Retention knobs for data that grows with traffic rather than with what site
 * owners create (page views, the 404 log). All are env vars so an operator can
 * tighten them for PDPA without a code change.
 */

const positiveInt = (raw: string | undefined, fallback: number, min = 1): number => {
  const value = Number(raw ?? '');
  return Number.isFinite(value) && value >= min ? Math.floor(value) : fallback;
};

/** Default cadence: once a day. */
export const RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Months of page views to keep, counting the current one. Analytics compares
 * at most 30 days with the 30 before, so 3 is the floor; 13 keeps a year plus
 * the same month last year.
 */
export const pageviewRetentionMonths = (): number =>
  positiveInt(process.env.PAGEVIEW_RETENTION_MONTHS, 13, 3);

/** Future monthly partitions created ahead of time, so inserts never hit the default. */
export const pageviewPartitionsAhead = (): number =>
  positiveInt(process.env.PAGEVIEW_PARTITIONS_AHEAD, 2);

/** Days a 404 address may go unseen before it is forgotten. */
export const notFoundRetentionDays = (): number =>
  positiveInt(process.env.NOT_FOUND_RETENTION_DAYS, 90);

/**
 * Most distinct 404 addresses kept per site. Bots probe thousands of random
 * paths; past this many, new addresses are no longer recorded (known ones still
 * count hits) and the sweep trims the least-recently-seen rows.
 */
export const notFoundMaxPerSite = (): number =>
  positiveInt(process.env.NOT_FOUND_MAX_PER_SITE, 1000, 10);

export const retentionIntervalMs = (): number =>
  positiveInt(process.env.RETENTION_INTERVAL_MINUTES, 1440) * 60_000;

/** The worker owns the sweep; the API runs it only with `RETENTION_INLINE=true`. */
export const retentionInlineEnabled = (): boolean => process.env.RETENTION_INLINE === 'true';

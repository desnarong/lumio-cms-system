/**
 * Monthly partitions of `pageviews` (docs/design/11-data-model.md 11.6).
 *
 * The init migration only created `pageviews_default`, so every row landed
 * there and nothing ever aged out. The worker now keeps one partition per UTC
 * month, a few months ahead of time, and drops whole months once they fall out
 * of the retention window: dropping a partition is instant and leaves no bloat,
 * unlike `DELETE`.
 *
 * Everything here is pure so the plan can be tested without a database.
 */

export const PAGEVIEW_PARTITION_PREFIX = 'pageviews_p';

const PARTITION_NAME = /^pageviews_p(\d{4})_(\d{2})$/;

/** First instant of the UTC month that contains `date`. */
export const monthStart = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

export const addMonths = (date: Date, months: number): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));

/** `pageviews_p2026_11` for November 2026. */
export const partitionName = (month: Date): string => {
  const start = monthStart(month);
  const mm = String(start.getUTCMonth() + 1).padStart(2, '0');
  return `${PAGEVIEW_PARTITION_PREFIX}${start.getUTCFullYear()}_${mm}`;
};

/** The month a partition name stands for, or null for any other table. */
export const partitionMonth = (name: string): Date | null => {
  const match = PARTITION_NAME.exec(name);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return new Date(Date.UTC(year, month - 1, 1));
};

export interface PartitionRange {
  name: string;
  /** Inclusive lower bound. */
  from: Date;
  /** Exclusive upper bound (first instant of the next month). */
  to: Date;
}

export const partitionRange = (month: Date): PartitionRange => {
  const from = monthStart(month);
  return { name: partitionName(from), from, to: addMonths(from, 1) };
};

export interface PartitionPlanInput {
  now: Date;
  /** Months to keep, counting the current one. */
  retentionMonths: number;
  /** Future months to create ahead of time. */
  aheadMonths: number;
  /** Partition tables that already exist. */
  existing: readonly string[];
  /** Months that still have rows sitting in `pageviews_default`. */
  defaultMonths: readonly Date[];
}

export interface PartitionPlan {
  /** Oldest kept instant: rows and partitions before it are dropped. */
  cutoff: Date;
  /** Partitions to create, oldest first (rows in the default move into them). */
  create: PartitionRange[];
  /** Existing partitions entirely older than the cutoff. */
  drop: string[];
}

export const planPartitions = ({
  now,
  retentionMonths,
  aheadMonths,
  existing,
  defaultMonths,
}: PartitionPlanInput): PartitionPlan => {
  const current = monthStart(now);
  const cutoff = addMonths(current, -(Math.max(1, retentionMonths) - 1));
  const existingNames = new Set(existing);

  const wanted = new Map<string, Date>();
  for (let offset = 0; offset <= Math.max(0, aheadMonths); offset += 1) {
    const month = addMonths(current, offset);
    wanted.set(partitionName(month), month);
  }
  // Rows already in the default for a kept month get their own partition too,
  // otherwise attaching that month later would fail on the default's rows.
  for (const month of defaultMonths) {
    const start = monthStart(month);
    if (start >= cutoff) wanted.set(partitionName(start), start);
  }

  const create = [...wanted.values()]
    .filter((month) => !existingNames.has(partitionName(month)))
    .sort((a, b) => a.getTime() - b.getTime())
    .map(partitionRange);

  const drop = existing
    .filter((name) => {
      const month = partitionMonth(name);
      return month !== null && addMonths(month, 1) <= cutoff;
    })
    .sort();

  return { cutoff, create, drop };
};

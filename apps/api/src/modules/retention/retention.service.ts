import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PAGEVIEW_PARTITION_PREFIX,
  partitionMonth,
  planPartitions,
  type PartitionRange,
} from './pageview-partitions';
import {
  notFoundMaxPerSite,
  notFoundRetentionDays,
  pageviewPartitionsAhead,
  pageviewRetentionMonths,
  trashRetentionDays,
} from './retention.config';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Serialises the partition work when several workers run the sweep at once. */
const PARTITION_LOCK_KEY = 'lumio:pageview-partitions';

const PAGEVIEW_COLUMNS = '"site_id", "path", "referrer", "country", "device", "session_hash", "ts"';

export interface PartitionSummary {
  created: string[];
  dropped: string[];
  /** Rows moved out of `pageviews_default` into their month's partition. */
  moved: number;
  /** Rows in `pageviews_default` older than the retention window, deleted. */
  expired: number;
}

export interface TrashSummary {
  sites: number;
  promotions: number;
  bookingServices: number;
  forms: number;
  membershipPlans: number;
}

export interface NotFoundSummary {
  sites: number;
  removed: number;
}

/**
 * Only names produced by `partitionName` are ever spliced into DDL, so this
 * check is what makes the `$executeRawUnsafe` calls below safe.
 */
const assertPartitionName = (name: string): string => {
  if (partitionMonth(name) === null) throw new Error(`unexpected partition name: ${name}`);
  return `"${name}"`;
};

/**
 * Keeps traffic-driven tables bounded (docs/design/11-data-model.md 11.6,
 * 15-security.md PDPA): monthly `pageviews` partitions with whole-month expiry,
 * and a stale/size-capped 404 log per site.
 */
@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(private readonly db: PrismaService) {}

  async maintainPageviewPartitions(now: Date = new Date()): Promise<PartitionSummary> {
    return this.db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${PARTITION_LOCK_KEY}))`;

        const existing = await tx.$queryRaw<{ name: string }[]>`
          SELECT child.relname AS name
          FROM pg_inherits
          JOIN pg_class child ON child.oid = pg_inherits.inhrelid
          JOIN pg_class parent ON parent.oid = pg_inherits.inhparent
          WHERE parent.relname = 'pageviews'
            AND child.relname LIKE ${`${PAGEVIEW_PARTITION_PREFIX}%`}
        `;
        const defaultMonths = await tx.$queryRaw<{ month: Date }[]>`
          SELECT DISTINCT date_trunc('month', "ts" AT TIME ZONE 'UTC') AS month
          FROM "pageviews_default"
        `;

        const plan = planPartitions({
          now,
          retentionMonths: pageviewRetentionMonths(),
          aheadMonths: pageviewPartitionsAhead(),
          existing: existing.map((row) => row.name),
          defaultMonths: defaultMonths.map((row) => row.month),
        });

        let moved = 0;
        for (const range of plan.create) moved += await this.createPartition(tx, range);

        for (const name of plan.drop) {
          await tx.$executeRawUnsafe(`DROP TABLE IF EXISTS ${assertPartitionName(name)}`);
        }

        const expired = await tx.$executeRaw`
          DELETE FROM "pageviews_default" WHERE "ts" < ${plan.cutoff}
        `;

        return {
          created: plan.create.map((range) => range.name),
          dropped: plan.drop,
          moved,
          expired,
        };
      },
      // Moving a busy default partition can take a while on the first run.
      { timeout: 120_000, maxWait: 30_000 },
    );
  }

  /**
   * Creates one month as a plain table, moves that month's rows out of the
   * default partition, then attaches it. `CREATE TABLE … PARTITION OF` would
   * fail instead whenever the default already holds rows for that month.
   */
  private async createPartition(
    tx: Prisma.TransactionClient,
    range: PartitionRange,
  ): Promise<number> {
    const table = assertPartitionName(range.name);
    const from = range.from.toISOString();
    const to = range.to.toISOString();

    await tx.$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS ${table} (LIKE "pageviews" INCLUDING DEFAULTS INCLUDING CONSTRAINTS)`,
    );
    const moved = await tx.$executeRawUnsafe(
      `WITH moved AS (
         DELETE FROM "pageviews_default" WHERE "ts" >= $1::timestamptz AND "ts" < $2::timestamptz
         RETURNING ${PAGEVIEW_COLUMNS}
       )
       INSERT INTO ${table} (${PAGEVIEW_COLUMNS}) SELECT ${PAGEVIEW_COLUMNS} FROM moved`,
      from,
      to,
    );
    await tx.$executeRawUnsafe(
      `ALTER TABLE "pageviews" ATTACH PARTITION ${table} FOR VALUES FROM ('${from}') TO ('${to}')`,
    );
    // Reads and writes go through "pageviews", whose site_isolation policy
    // applies. Direct access to the partition gets no rows (no policy here).
    await tx.$executeRawUnsafe(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    await tx.$executeRawUnsafe(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`);
    return moved;
  }

  /**
   * Forgets 404 addresses not seen for `NOT_FOUND_RETENTION_DAYS`, then trims
   * each site to its newest `NOT_FOUND_MAX_PER_SITE`. `not_found` is under RLS,
   * so the sweep runs site by site inside `forSite`.
   */
  async pruneNotFound(now: Date = new Date()): Promise<NotFoundSummary> {
    const cutoff = new Date(now.getTime() - notFoundRetentionDays() * DAY_MS);
    const limit = notFoundMaxPerSite();
    const sites = await this.db.site.findMany({ select: { id: true } });

    let removed = 0;
    for (const site of sites) {
      removed += await this.db.forSite(site.id, async (tx) => {
        const stale = await tx.notFound.deleteMany({
          where: { siteId: site.id, lastSeenAt: { lt: cutoff } },
        });
        const overflow = await tx.notFound.findMany({
          where: { siteId: site.id },
          orderBy: [{ lastSeenAt: 'desc' }, { hits: 'desc' }],
          skip: limit,
          select: { id: true },
        });
        if (overflow.length === 0) return stale.count;
        const trimmed = await tx.notFound.deleteMany({
          where: { id: { in: overflow.map((row) => row.id) } },
        });
        return stale.count + trimmed.count;
      });
    }

    return { sites: sites.length, removed };
  }

  /**
   * Hard-deletes soft-deleted rows whose undo window has passed. Each table is
   * under RLS, so this also runs site by site.
   */
  async purgeDeleted(now: Date = new Date()): Promise<TrashSummary> {
    const cutoff = new Date(now.getTime() - trashRetentionDays() * DAY_MS);
    const expired = { deletedAt: { lt: cutoff } };
    const sites = await this.db.site.findMany({ select: { id: true } });
    const summary: TrashSummary = {
      sites: sites.length,
      promotions: 0,
      bookingServices: 0,
      forms: 0,
      membershipPlans: 0,
    };

    for (const site of sites) {
      await this.db.forSite(site.id, async (tx) => {
        const where = { siteId: site.id, ...expired };
        summary.promotions += (await tx.promotion.deleteMany({ where })).count;
        summary.bookingServices += (await tx.bookingService.deleteMany({ where })).count;
        summary.forms += (await tx.form.deleteMany({ where })).count;
        summary.membershipPlans += (await tx.membershipPlan.deleteMany({ where })).count;
      });
    }
    return summary;
  }

  /** One full pass; each part runs even if another fails. */
  async sweep(now: Date = new Date()): Promise<void> {
    try {
      const partitions = await this.maintainPageviewPartitions(now);
      if (partitions.created.length + partitions.dropped.length + partitions.expired > 0) {
        this.logger.log(
          `pageviews: สร้าง ${partitions.created.length} partition (ย้าย ${partitions.moved} แถว), ลบ ${partitions.dropped.length} partition, ลบแถวเก่า ${partitions.expired} แถว`,
        );
      }
    } catch (error) {
      this.logger.warn(`ดูแล partition ของ pageviews ไม่สำเร็จ: ${String(error)}`);
    }

    try {
      const notFound = await this.pruneNotFound(now);
      if (notFound.removed > 0) {
        this.logger.log(`not_found: ลบที่อยู่เก่า/เกินโควตา ${notFound.removed} แถว`);
      }
    } catch (error) {
      this.logger.warn(`ล้าง log 404 ไม่สำเร็จ: ${String(error)}`);
    }

    try {
      const trash = await this.purgeDeleted(now);
      const purged =
        trash.promotions + trash.bookingServices + trash.forms + trash.membershipPlans;
      if (purged > 0) this.logger.log(`ถังขยะ: ลบถาวร ${purged} รายการที่เกินระยะกู้คืน`);
    } catch (error) {
      this.logger.warn(`ล้างถังขยะไม่สำเร็จ: ${String(error)}`);
    }
  }
}

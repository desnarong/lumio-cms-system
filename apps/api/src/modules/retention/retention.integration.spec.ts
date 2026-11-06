import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { RetentionService } from './retention.service';

const SITE_ID = '7e7e0000-0000-4000-8000-0000000000a1';
const NOW = new Date('2026-11-06T12:00:00Z');

/**
 * Runs the partition maintenance against a real Postgres. It drops every
 * monthly `pageviews` partition first, so it only runs when the database is
 * declared disposable with `LUMIO_DESTRUCTIVE_DB_TESTS=1` (CI sets it; never
 * point it at a database whose analytics you want to keep).
 */
const destructive = process.env.LUMIO_DESTRUCTIVE_DB_TESTS === '1';

describe.skipIf(!process.env.DATABASE_URL || !destructive)('pageview partitions (database)', () => {
  let db: PrismaService;
  let service: RetentionService;

  const partitions = async (): Promise<string[]> => {
    const rows = await db.$queryRaw<{ name: string }[]>`
      SELECT child.relname AS name
      FROM pg_inherits
      JOIN pg_class child ON child.oid = pg_inherits.inhrelid
      JOIN pg_class parent ON parent.oid = pg_inherits.inhparent
      WHERE parent.relname = 'pageviews'
      ORDER BY 1
    `;
    return rows.map((row) => row.name);
  };

  const insertView = (ts: string, path: string) =>
    db.forSite(
      SITE_ID,
      (tx) =>
        tx.$executeRaw`
        INSERT INTO "pageviews" ("site_id", "path", "ts")
        VALUES (${SITE_ID}::uuid, ${path}, ${new Date(ts)})
      `,
    );

  const viewsOf = (table: string) =>
    db.$queryRawUnsafe<{ path: string }[]>(
      `SELECT "path" FROM "${table}" WHERE "site_id" = $1::uuid ORDER BY "ts"`,
      SITE_ID,
    );

  beforeAll(async () => {
    process.env.PAGEVIEW_RETENTION_MONTHS = '3';
    process.env.PAGEVIEW_PARTITIONS_AHEAD = '1';
    db = new PrismaService();
    // As Nest boots it: this also drops forSite() to the RLS session role, so
    // the seeded sites' page views stay out of this site's queries.
    await db.onModuleInit();
    service = new RetentionService(db);

    // Start from the shape the init migration leaves: only the default partition.
    for (const name of await partitions()) {
      if (name.startsWith('pageviews_p')) await db.$executeRawUnsafe(`DROP TABLE "${name}"`);
    }
    await db.site.deleteMany({ where: { id: SITE_ID } });
    await db.site.create({
      data: { id: SITE_ID, name: 'Retention test', subdomain: 'retention-test' },
    });
    // Rows that arrived before partitions existed sit in the default.
    await insertView('2026-01-15T00:00:00Z', '/expired');
    await insertView('2026-10-20T00:00:00Z', '/last-month');
    await insertView('2026-11-02T00:00:00Z', '/this-month');
  });

  afterAll(async () => {
    delete process.env.PAGEVIEW_RETENTION_MONTHS;
    delete process.env.PAGEVIEW_PARTITIONS_AHEAD;
    await db.forSite(SITE_ID, (tx) => tx.$executeRaw`DELETE FROM "pageviews"`);
    await db.site.deleteMany({ where: { id: SITE_ID } });
    await db.$disconnect();
  });

  it('moves kept months out of the default and drops expired rows', async () => {
    const summary = await service.maintainPageviewPartitions(NOW);

    expect(summary.created).toEqual(
      expect.arrayContaining(['pageviews_p2026_10', 'pageviews_p2026_11', 'pageviews_p2026_12']),
    );
    expect(await partitions()).toEqual(
      expect.arrayContaining([
        'pageviews_default',
        'pageviews_p2026_10',
        'pageviews_p2026_11',
        'pageviews_p2026_12',
      ]),
    );
    expect(await viewsOf('pageviews_p2026_10')).toEqual([{ path: '/last-month' }]);
    expect(await viewsOf('pageviews_p2026_11')).toEqual([{ path: '/this-month' }]);
    expect(await viewsOf('pageviews_default')).toEqual([]);
  });

  it('still answers through the parent table under RLS', async () => {
    const rows = await db.forSite(
      SITE_ID,
      (tx) => tx.$queryRaw<{ path: string }[]>`SELECT "path" FROM "pageviews" ORDER BY "ts"`,
    );
    expect(rows.map((row) => row.path)).toEqual(['/last-month', '/this-month']);
  });

  it('routes new views into their month and is idempotent', async () => {
    await insertView('2026-12-24T00:00:00Z', '/next-month');
    const again = await service.maintainPageviewPartitions(NOW);

    expect(again.created).toEqual([]);
    expect(await viewsOf('pageviews_p2026_12')).toEqual([{ path: '/next-month' }]);
  });

  it('drops whole months once they leave the window', async () => {
    const later = await service.maintainPageviewPartitions(new Date('2027-02-10T00:00:00Z'));

    expect(later.dropped).toEqual(['pageviews_p2026_10', 'pageviews_p2026_11']);
    expect(await partitions()).not.toContain('pageviews_p2026_11');
    expect(await partitions()).toContain('pageviews_p2027_03');
  });
});

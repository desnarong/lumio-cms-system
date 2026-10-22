import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runForSite, runForUser } from './site-context';

const SITE_A = '30000000-0000-4000-8000-0000000000a1';
const SITE_B = '30000000-0000-4000-8000-0000000000a2';
const MEMBER_USER = '30000000-0000-4000-8000-0000000000b1';
const OUTSIDER_USER = '30000000-0000-4000-8000-0000000000b2';

const TEST_ROLE = 'lumio_rls_test';
const TEST_PASSWORD = 'lumio_rls_test';

const adminUrl = process.env.DATABASE_URL;

/** Same database, but connected as a non-owner role so RLS policies apply. */
function toAppUrl(url: string): string {
  const parsed = new URL(url);
  parsed.username = TEST_ROLE;
  parsed.password = TEST_PASSWORD;
  return parsed.toString();
}

/**
 * Verifies the RLS policy from docs/design/11-data-model.md 11.5 against a real
 * database. Runs only when DATABASE_URL is set (CI provides a Postgres service,
 * local runs use docker compose).
 */
describe.skipIf(!adminUrl)('RLS site isolation', () => {
  let admin: PrismaClient;
  let app: PrismaClient;

  const dropTestRole = async (): Promise<void> => {
    await admin.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${TEST_ROLE}') THEN
          EXECUTE 'DROP OWNED BY "${TEST_ROLE}"';
          EXECUTE 'DROP ROLE "${TEST_ROLE}"';
        END IF;
      END
      $$;
    `);
  };

  beforeAll(async () => {
    admin = new PrismaClient();
    app = new PrismaClient({ datasources: { db: { url: toAppUrl(adminUrl ?? '') } } });

    await admin.site.deleteMany({ where: { id: { in: [SITE_A, SITE_B] } } });
    await admin.user.deleteMany({ where: { id: { in: [MEMBER_USER, OUTSIDER_USER] } } });
    await dropTestRole();
    await admin.$executeRawUnsafe(
      `CREATE ROLE "${TEST_ROLE}" LOGIN PASSWORD '${TEST_PASSWORD}' NOSUPERUSER NOBYPASSRLS`,
    );
    await admin.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${TEST_ROLE}"`);
    await admin.$executeRawUnsafe(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${TEST_ROLE}"`,
    );
    await admin.$executeRawUnsafe(
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${TEST_ROLE}"`,
    );

    await admin.site.createMany({
      data: [
        { id: SITE_A, name: 'เว็บทดสอบ ก', subdomain: 'rls-isolation-a' },
        { id: SITE_B, name: 'เว็บทดสอบ ข', subdomain: 'rls-isolation-b' },
      ],
    });
    await admin.user.createMany({
      data: [
        { id: MEMBER_USER, email: 'rls-member@lumio.test', name: 'สมาชิกเว็บ ก' },
        { id: OUTSIDER_USER, email: 'rls-outsider@lumio.test', name: 'คนนอก' },
      ],
    });
    await runForSite(app, SITE_A, (tx) =>
      tx.siteMember.create({ data: { siteId: SITE_A, userId: MEMBER_USER, role: 'owner' } }),
    );
    await runForSite(app, SITE_A, (tx) =>
      tx.content.create({
        data: { siteId: SITE_A, type: 'page', title: 'หน้าแรกของเว็บ ก', slug: 'home' },
      }),
    );
    await runForSite(app, SITE_B, (tx) =>
      tx.content.create({
        data: { siteId: SITE_B, type: 'page', title: 'หน้าแรกของเว็บ ข', slug: 'home' },
      }),
    );
  });

  afterAll(async () => {
    await admin.site.deleteMany({ where: { id: { in: [SITE_A, SITE_B] } } });
    await admin.user.deleteMany({ where: { id: { in: [MEMBER_USER, OUTSIDER_USER] } } });
    await dropTestRole();
    await app.$disconnect();
    await admin.$disconnect();
  });

  it('returns only the rows of the current site', async () => {
    const rows = await runForSite(app, SITE_A, (tx) => tx.content.findMany());
    expect(rows).toHaveLength(1);
    expect(rows[0]?.siteId).toBe(SITE_A);
  });

  it('cannot read another site even when its id is requested explicitly', async () => {
    const rows = await runForSite(app, SITE_A, (tx) =>
      tx.content.findMany({ where: { siteId: SITE_B } }),
    );
    expect(rows).toHaveLength(0);
  });

  it('cannot insert rows belonging to another site', async () => {
    await expect(
      runForSite(app, SITE_A, (tx) =>
        tx.content.create({
          data: { siteId: SITE_B, type: 'page', title: 'แอบเขียนข้ามเว็บ', slug: 'sneaky' },
        }),
      ),
    ).rejects.toThrow();
  });

  it('exposes nothing when no site context is set', async () => {
    const rows = await app.content.findMany({ where: { siteId: { in: [SITE_A, SITE_B] } } });
    expect(rows).toHaveLength(0);
  });

  it('lets a user read their own membership before a site is known', async () => {
    const rows = await runForUser(app, MEMBER_USER, (tx) =>
      tx.siteMember.findMany({ where: { userId: MEMBER_USER } }),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.siteId).toBe(SITE_A);
  });

  it('does not reveal memberships of other users', async () => {
    const rows = await runForUser(app, OUTSIDER_USER, (tx) => tx.siteMember.findMany());
    expect(rows).toHaveLength(0);
  });
});

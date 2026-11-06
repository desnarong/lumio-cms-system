import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const prismaDir = join(__dirname, '..', '..', '..', 'prisma');

/** Tables whose rows belong to a site: every model with a `siteId` column. */
const siteTables = (): string[] => {
  const schema = readFileSync(join(prismaDir, 'schema.prisma'), 'utf8');
  const tables: string[] = [];
  for (const match of schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
    const body = match[2] ?? '';
    if (!/^\s*siteId\s/m.test(body)) continue;
    tables.push(/@@map\("([^"]+)"\)/.exec(body)?.[1] ?? match[1] ?? '');
  }
  return tables;
};

const migrationSql = (): string =>
  readdirSync(join(prismaDir, 'migrations'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) =>
      readFileSync(join(prismaDir, 'migrations', entry.name, 'migration.sql'), 'utf8'),
    )
    .join('\n');

/**
 * Static guard for the iron rule "every site table has site_id + RLS"
 * (docs/design/11-data-model.md 11.5): a new table with a `siteId` column
 * cannot ship without ENABLE and FORCE ROW LEVEL SECURITY in a migration.
 * The runtime behaviour is covered by site-isolation.spec.ts.
 */
/**
 * Tables that have RLS enabled but are deliberately not FORCEd: the API has to
 * look them up (host name -> site, user -> memberships) before a site context
 * exists. Adding a table here needs a reason in review.
 */
const NOT_FORCED = new Set(['site_members', 'domains']);

describe('RLS coverage of site tables', () => {
  const sql = migrationSql();
  const tables = siteTables();

  it('finds the site tables in the schema', () => {
    expect(tables.length).toBeGreaterThan(20);
  });

  it.each(tables)('%s has ENABLE and FORCE ROW LEVEL SECURITY', (table) => {
    expect(sql).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
    if (NOT_FORCED.has(table)) return;
    expect(sql).toContain(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`);
  });
});

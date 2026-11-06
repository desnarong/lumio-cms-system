import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * Role every tenant-scoped transaction drops to (migration
 * 20261118000000_rls_session_role). It is never superuser or BYPASSRLS, so the
 * `site_isolation` / `user_isolation` policies apply even when the API
 * connects as the table owner. A constant, because a role name cannot be a
 * bind parameter.
 */
export const RLS_SESSION_ROLE = 'lumio_rls';

/** Narrows the rest of the transaction to {@link RLS_SESSION_ROLE}. */
async function dropToRlsRole(tx: Prisma.TransactionClient, enabled: boolean): Promise<void> {
  if (enabled) await tx.$executeRawUnsafe(`SET LOCAL ROLE ${RLS_SESSION_ROLE}`);
}

/**
 * Sets the RLS session variable for the current transaction so that every query
 * is restricted to one site (docs/design/11-data-model.md 11.5). The value is
 * parameterised, so it cannot break out of the statement.
 */
export async function setSiteContext(tx: Prisma.TransactionClient, siteId: string): Promise<void> {
  await tx.$executeRaw`SELECT set_config('app.current_site', ${siteId}, true)`;
}

/**
 * Runs `fn` inside a transaction scoped to `siteId`. Use this for every query
 * that touches website data instead of the bare client. With `dropRole` the
 * transaction also runs as {@link RLS_SESSION_ROLE}, which is what makes the
 * policies bind when the connection itself bypasses RLS.
 */
export function runForSite<T>(
  prisma: PrismaClient,
  siteId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  dropRole = false,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await dropToRlsRole(tx, dropRole);
    await setSiteContext(tx, siteId);
    return fn(tx);
  });
}

/**
 * Sets the signed-in user for the current transaction. The `user_isolation`
 * policy on `site_members` reads it so a user can list the sites they belong to
 * before any single site is known (docs/design/12-api.md 12.1).
 */
export async function setUserContext(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  await tx.$executeRaw`SELECT set_config('app.current_user', ${userId}, true)`;
}

/**
 * Runs `fn` inside a transaction scoped to `userId`. Use this for
 * cross-site queries that start from the current user (e.g. "my sites").
 */
export function runForUser<T>(
  prisma: PrismaClient,
  userId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  dropRole = false,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await dropToRlsRole(tx, dropRole);
    await setUserContext(tx, userId);
    return fn(tx);
  });
}

interface RoleCheckRow {
  bypasses: boolean;
  canUseRlsRole: boolean;
}

/**
 * Whether tenant transactions should switch to {@link RLS_SESSION_ROLE}, and
 * whether the connection would otherwise skip RLS. A role that is itself
 * subject to RLS and not a member of the session role needs no switch.
 */
export async function inspectRlsRole(prisma: PrismaClient): Promise<RoleCheckRow> {
  const [row] = await prisma.$queryRaw<RoleCheckRow[]>`
    SELECT
      (r.rolsuper OR r.rolbypassrls) AS "bypasses",
      CASE
        WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = ${RLS_SESSION_ROLE})
          THEN pg_has_role(current_user, ${RLS_SESSION_ROLE}, 'MEMBER')
        ELSE false
      END AS "canUseRlsRole"
    FROM pg_roles r
    WHERE r.rolname = current_user
  `;
  return row ?? { bypasses: false, canUseRlsRole: false };
}

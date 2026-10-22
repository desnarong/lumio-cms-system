import type { Prisma, PrismaClient } from '@prisma/client';

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
 * that touches website data instead of the bare client.
 */
export function runForSite<T>(
  prisma: PrismaClient,
  siteId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
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
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await setUserContext(tx, userId);
    return fn(tx);
  });
}

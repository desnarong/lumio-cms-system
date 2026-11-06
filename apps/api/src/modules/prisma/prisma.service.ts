import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient, type Prisma } from '@prisma/client';
import { inspectRlsRole, RLS_SESSION_ROLE, runForSite, runForUser } from './site-context';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  /** Tenant transactions run as {@link RLS_SESSION_ROLE} when the database has it. */
  private dropRole = false;

  async onModuleInit(): Promise<void> {
    await this.$connect();
    const { bypasses, canUseRlsRole } = await inspectRlsRole(this);
    this.dropRole = canUseRlsRole;
    if (bypasses && !canUseRlsRole) {
      // Every forSite() query would see every site: say so loudly rather than
      // serve one tenant's data to another (docs/design/15-security.md).
      this.logger.error(
        `The database role bypasses row-level security and cannot switch to ${RLS_SESSION_ROLE}. ` +
          'Run the migrations as a role with CREATEROLE, or connect as a NOBYPASSRLS role.',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Tenant-scoped client: every query inside `fn` is filtered by RLS to `siteId`.
   */
  forSite<T>(siteId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return runForSite(this, siteId, fn, this.dropRole);
  }

  /**
   * User-scoped client: lets the `user_isolation` policy reveal the current
   * user's own memberships across sites.
   */
  forUser<T>(userId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return runForUser(this, userId, fn, this.dropRole);
  }
}

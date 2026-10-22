import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient, type Prisma } from '@prisma/client';
import { runForSite, runForUser } from './site-context';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Tenant-scoped client: every query inside `fn` is filtered by RLS to `siteId`.
   */
  forSite<T>(siteId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return runForSite(this, siteId, fn);
  }

  /**
   * User-scoped client: lets the `user_isolation` policy reveal the current
   * user's own memberships across sites.
   */
  forUser<T>(userId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return runForUser(this, userId, fn);
  }
}

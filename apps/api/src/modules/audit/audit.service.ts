import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  action: string;
  target: string;
  siteId: string;
  userId?: string | null;
  meta?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  constructor(private readonly db: PrismaService) {}

  /**
   * Records an important write or delete in audit_logs. The table is under RLS,
   * so the entry is written inside the site-scoped transaction.
   */
  log(entry: AuditEntry): Promise<void> {
    return this.db.forSite(entry.siteId, async (tx) => {
      await tx.auditLog.create({
        data: {
          siteId: entry.siteId,
          userId: entry.userId ?? null,
          action: entry.action,
          target: entry.target,
          meta: entry.meta ?? undefined,
        },
      });
    });
  }
}

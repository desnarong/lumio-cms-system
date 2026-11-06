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
    return this.db.forSite(entry.siteId, (tx) => this.record(tx, entry));
  }

  /**
   * Same entry, written in the caller's site-scoped transaction. Use it for
   * deletes and other important writes so the change and its audit row commit
   * or roll back together (AGENTS.md rule 5).
   */
  async record(tx: Prisma.TransactionClient, entry: AuditEntry): Promise<void> {
    await tx.auditLog.create({
      data: {
        siteId: entry.siteId,
        userId: entry.userId ?? null,
        action: entry.action,
        target: entry.target,
        meta: entry.meta ?? undefined,
      },
    });
  }
}

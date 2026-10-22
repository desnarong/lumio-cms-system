import { Injectable } from '@nestjs/common';
import {
  isRedirectCode,
  normalizeRedirectPath,
  type CreateRedirectInput,
  type RedirectList,
  type RedirectRule,
  type UpdateRedirectInput,
} from '@lumio/shared';
import type { Redirect } from '@prisma/client';
import { ApiException } from '../../common/api-error';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const toRule = (row: Redirect): RedirectRule => ({
  fromPath: row.fromPath,
  toPath: row.toPath,
  code: isRedirectCode(row.code) ? row.code : 301,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const key = (siteId: string, fromPath: string) => ({ siteId, fromPath });

/**
 * Redirect manager (docs/design/14-seo-performance.md 14.1). Rules are site data,
 * so every query runs inside `forSite` and is isolated by RLS. The public API
 * only follows a rule when no page matches, so a redirect can never shadow a
 * real page.
 */
@Injectable()
export class RedirectsService {
  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(siteId: string): Promise<RedirectList> {
    const rows = await this.db.forSite(siteId, (tx) =>
      tx.redirect.findMany({ orderBy: [{ fromPath: 'asc' }], take: 500 }),
    );

    return { items: rows.map(toRule) };
  }

  async create(
    siteId: string,
    input: CreateRedirectInput,
    actorId: string,
  ): Promise<RedirectRule> {
    const fromPath = normalizeRedirectPath(input.fromPath);

    const row = await this.db.forSite(siteId, async (tx) => {
      const existing = await tx.redirect.findUnique({
        where: { siteId_fromPath: key(siteId, fromPath) },
        select: { fromPath: true },
      });
      if (existing) throw ApiException.conflict('มีที่อยู่เดิมนี้เปลี่ยนเส้นทางอยู่แล้ว');

      const created = await tx.redirect.create({
        data: { siteId, fromPath, toPath: input.toPath, code: input.code },
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'redirect.create',
          target: fromPath,
          meta: { from: fromPath, to: input.toPath, code: input.code },
        },
      });

      return created;
    });

    return toRule(row);
  }

  /** Edits where a rule points; the old address itself stays the same. */
  async update(
    siteId: string,
    input: UpdateRedirectInput,
    actorId: string,
  ): Promise<RedirectRule> {
    const fromPath = normalizeRedirectPath(input.fromPath);

    const row = await this.db.forSite(siteId, async (tx) => {
      const current = await tx.redirect.findUnique({
        where: { siteId_fromPath: key(siteId, fromPath) },
        select: { fromPath: true },
      });
      if (!current) throw ApiException.notFound('ไม่พบการเปลี่ยนเส้นทางนี้');

      const updated = await tx.redirect.update({
        where: { siteId_fromPath: key(siteId, fromPath) },
        data: { toPath: input.toPath, code: input.code },
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'redirect.update',
          target: fromPath,
          meta: { from: fromPath, to: input.toPath, code: input.code },
        },
      });

      return updated;
    });

    return toRule(row);
  }

  async remove(siteId: string, fromPath: string | undefined, actorId: string): Promise<void> {
    if (typeof fromPath !== 'string' || fromPath.trim().length === 0) {
      throw ApiException.validation('ต้องระบุที่อยู่เดิมที่จะลบ');
    }
    const normalized = normalizeRedirectPath(fromPath);
    if (normalized === '/') throw ApiException.validation('ส่งหน้าแรกไปที่อื่นไม่ได้');

    await this.db.forSite(siteId, async (tx) => {
      const current = await tx.redirect.findUnique({
        where: { siteId_fromPath: key(siteId, normalized) },
        select: { fromPath: true, toPath: true, code: true },
      });
      if (!current) throw ApiException.notFound('ไม่พบการเปลี่ยนเส้นทางนี้');

      await tx.redirect.delete({
        where: { siteId_fromPath: key(siteId, normalized) },
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'redirect.remove',
          target: normalized,
          meta: { from: normalized, to: current.toPath, code: current.code },
        },
      });
    });
  }
}

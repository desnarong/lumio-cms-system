import { Injectable } from '@nestjs/common';
import { findPlan, quotaExceededMessage, type QuotaKind } from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Refuses writes that would go past the plan's quota (docs/design/18-deployment.md
 * 18.6). The screen already shows how full each quota is; this is the server side
 * of the same rule, so a second tab cannot slip one more page or image through.
 *
 * The message is business wording ("แพ็กเกจนี้มีได้ 3 หน้า…"), never a bare 409.
 */
@Injectable()
export class QuotaService {
  constructor(private readonly db: PrismaService) {}

  /** Pages only: posts and drafts outside the trash do not count (billing summary). */
  async assertCanAddPage(siteId: string, pages = 1): Promise<void> {
    const { plan, used } = await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({ where: { id: siteId }, select: { plan: true } });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
      const used = await tx.content.count({
        where: { type: 'page', status: { not: 'archived' } },
      });
      return { plan: site.plan, used };
    });

    const limit = findPlan(plan).quota.pages;
    if (limit !== null && used + pages > limit) this.fail('pages', limit);
  }

  /** The bytes kept for this site; trashed images still occupy space until purged. */
  async assertCanAddMediaBytes(siteId: string, bytes: number): Promise<void> {
    const { plan, used } = await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({ where: { id: siteId }, select: { plan: true } });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
      const aggregate = await tx.media.aggregate({
        _sum: { sizeBytes: true },
        where: { status: { not: 'trashed' } },
      });
      return { plan: site.plan, used: Number(aggregate._sum.sizeBytes ?? 0) };
    });

    const limit = findPlan(plan).quota.mediaBytes;
    if (limit !== null && used + bytes > limit) this.fail('mediaBytes', limit);
  }

  async assertCanAddMember(siteId: string): Promise<void> {
    const { plan, used } = await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({ where: { id: siteId }, select: { plan: true } });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
      const used = await tx.siteMember.count();
      return { plan: site.plan, used };
    });

    const limit = findPlan(plan).quota.team;
    if (limit !== null && used + 1 > limit) this.fail('team', limit);
  }

  private fail(kind: QuotaKind, limit: number): never {
    throw ApiException.conflict(quotaExceededMessage(kind, limit));
  }
}

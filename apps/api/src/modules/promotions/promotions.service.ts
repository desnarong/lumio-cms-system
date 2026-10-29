import { Injectable } from '@nestjs/common';
import type { Promotion as PromotionRow } from '@prisma/client';
import {
  isPromotionLive,
  isPromotionKind,
  type Promotion,
  type PromotionInput,
  type PublicPromotion,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublishService } from '../publish/publish.service';

const toPromotion = (row: PromotionRow): Promotion => ({
  id: row.id,
  title: row.title,
  description: row.description,
  kind: isPromotionKind(row.kind) ? row.kind : 'other',
  badge: row.badge,
  imageUrl: row.imageUrl,
  imageAlt: row.imageAlt,
  buyQty: row.buyQty,
  getQty: row.getQty,
  startsAt: row.startsAt ? row.startsAt.toISOString() : null,
  endsAt: row.endsAt ? row.endsAt.toISOString() : null,
  active: row.active,
  sort: row.sort,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

/** The subset the public promotion page receives. */
export const toPublicPromotion = (row: PromotionRow): PublicPromotion => ({
  id: row.id,
  title: row.title,
  description: row.description,
  kind: isPromotionKind(row.kind) ? row.kind : 'other',
  badge: row.badge,
  imageUrl: row.imageUrl,
  imageAlt: row.imageAlt,
  buyQty: row.buyQty,
  getQty: row.getQty,
  startsAt: row.startsAt ? row.startsAt.toISOString() : null,
  endsAt: row.endsAt ? row.endsAt.toISOString() : null,
});

const dateOrNull = (value: string | null | undefined): Date | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Offer campaigns of one site (docs/design/12-api.md 12.6). */
@Injectable()
export class PromotionsService {
  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
    private readonly publishJobs: PublishService,
  ) {}

  async list(siteId: string): Promise<Promotion[]> {
    const rows = await this.db.forSite(siteId, (tx) =>
      tx.promotion.findMany({ orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }] }),
    );
    return rows.map(toPromotion);
  }

  async create(siteId: string, input: PromotionInput, actorId: string): Promise<Promotion> {
    const row = await this.db.forSite(siteId, (tx) =>
      tx.promotion.create({
        data: {
          siteId,
          title: input.title,
          description: input.description,
          kind: input.kind,
          badge: input.badge,
          imageUrl: input.imageUrl ?? null,
          imageAlt: input.imageAlt,
          buyQty: input.buyQty ?? null,
          getQty: input.getQty ?? null,
          startsAt: dateOrNull(input.startsAt) ?? null,
          endsAt: dateOrNull(input.endsAt) ?? null,
          active: input.active,
          sort: input.sort,
        },
      }),
    );

    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'promotion.create',
      target: row.id,
      meta: { title: row.title },
    });
    // The promotion page is cached, so a new offer has to rebuild it now.
    await this.publishJobs.enqueueChrome(siteId);
    return toPromotion(row);
  }

  async update(
    siteId: string,
    promotionId: string,
    input: Partial<PromotionInput>,
    actorId: string,
  ): Promise<Promotion> {
    const row = await this.db.forSite(siteId, async (tx) => {
      const current = await tx.promotion.findUnique({ where: { id: promotionId } });
      if (!current) throw ApiException.notFound('ไม่พบโปรโมชั่นนี้');
      return tx.promotion.update({
        where: { id: promotionId },
        data: {
          title: input.title ?? undefined,
          description: input.description ?? undefined,
          kind: input.kind ?? undefined,
          badge: input.badge ?? undefined,
          imageUrl: input.imageUrl === undefined ? undefined : input.imageUrl,
          imageAlt: input.imageAlt ?? undefined,
          buyQty: input.buyQty === undefined ? undefined : input.buyQty,
          getQty: input.getQty === undefined ? undefined : input.getQty,
          startsAt: dateOrNull(input.startsAt),
          endsAt: dateOrNull(input.endsAt),
          active: input.active ?? undefined,
          sort: input.sort ?? undefined,
        },
      });
    });

    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'promotion.update',
      target: promotionId,
      meta: { fields: Object.keys(input) },
    });
    await this.publishJobs.enqueueChrome(siteId);
    return toPromotion(row);
  }

  async remove(siteId: string, promotionId: string, actorId: string): Promise<void> {
    const row = await this.db.forSite(siteId, async (tx) => {
      const current = await tx.promotion.findUnique({ where: { id: promotionId } });
      if (!current) throw ApiException.notFound('ไม่พบโปรโมชั่นนี้');
      await tx.promotion.delete({ where: { id: promotionId } });
      return current;
    });

    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'promotion.delete',
      target: promotionId,
      meta: { title: row.title },
    });
    await this.publishJobs.enqueueChrome(siteId);
  }

  /** Offers a visitor may see right now: switched on and inside their dates. */
  async listLive(siteId: string): Promise<PublicPromotion[]> {
    const rows = await this.db.forSite(siteId, (tx) =>
      tx.promotion.findMany({
        orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
        where: { active: true },
      }),
    );
    const now = new Date();
    return rows
      .filter((row) => row.active && isPromotionLive(toPublicPromotion(row), now))
      .map(toPublicPromotion);
  }
}

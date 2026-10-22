import { Injectable } from '@nestjs/common';
import type { Subscriber as SubscriberRow } from '@prisma/client';
import {
  isSubscriberStatus,
  subscribersToCsv,
  type CreateSubscriberInput,
  type Subscriber,
  type SubscriberList,
  type SubscriberListQuery,
  type UpdateSubscriberInput,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

/** Exporting the whole list is bounded, so one click can never pull unbounded rows. */
const MAX_EXPORT = 5000;

const toSubscriber = (row: SubscriberRow): Subscriber => ({
  id: row.id,
  email: row.email,
  status: isSubscriberStatus(row.status) ? row.status : 'active',
  createdAt: row.createdAt.toISOString(),
});

/**
 * Newsletter subscribers (docs/design/05-admin-ia.md "เติบโต › Newsletter").
 * Every query runs inside `forSite`, so RLS keeps one site's list out of another's.
 */
@Injectable()
export class NewsletterService {
  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(siteId: string, query: SubscriberListQuery): Promise<SubscriberList> {
    return this.db.forSite(siteId, async (tx) => {
      const where = {
        ...(query.status ? { status: query.status } : {}),
        ...(query.q ? { email: { contains: query.q } } : {}),
      };

      const rows = await tx.subscriber.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: query.limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      });
      const [total, activeCount] = await Promise.all([
        tx.subscriber.count({ where }),
        tx.subscriber.count({ where: { status: 'active' } }),
      ]);

      const items = rows.slice(0, query.limit).map(toSubscriber);
      return {
        items,
        cursor: rows.length > query.limit ? (items.at(-1)?.id ?? null) : null,
        total,
        activeCount,
      };
    });
  }

  async create(
    siteId: string,
    input: CreateSubscriberInput,
    actorId: string,
  ): Promise<Subscriber> {
    const row = await this.db.forSite(siteId, async (tx) => {
      const existing = await tx.subscriber.findFirst({
        where: { email: input.email },
        select: { id: true },
      });
      if (existing) throw ApiException.conflict('อีเมลนี้อยู่ในรายการแล้ว');

      const created = await tx.subscriber.create({
        data: { siteId, email: input.email, status: 'active' },
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'subscriber.create',
          target: created.id,
          meta: { email: created.email },
        },
      });

      return created;
    });

    return toSubscriber(row);
  }

  async update(
    siteId: string,
    subscriberId: string,
    input: UpdateSubscriberInput,
    actorId: string,
  ): Promise<Subscriber> {
    const row = await this.db.forSite(siteId, async (tx) => {
      const current = await tx.subscriber.findUnique({
        where: { id: subscriberId },
        select: { id: true },
      });
      if (!current) throw ApiException.notFound('ไม่พบผู้ติดตามนี้');

      const updated = await tx.subscriber.update({
        where: { id: subscriberId },
        data: { status: input.status },
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'subscriber.update',
          target: subscriberId,
          meta: { status: input.status },
        },
      });

      return updated;
    });

    return toSubscriber(row);
  }

  async remove(siteId: string, subscriberId: string, actorId: string): Promise<void> {
    await this.db.forSite(siteId, async (tx) => {
      const current = await tx.subscriber.findUnique({
        where: { id: subscriberId },
        select: { email: true },
      });
      if (!current) throw ApiException.notFound('ไม่พบผู้ติดตามนี้');

      await tx.subscriber.delete({ where: { id: subscriberId } });
      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'subscriber.delete',
          target: subscriberId,
          meta: { email: current.email },
        },
      });
    });
  }

  /** CSV of the whole list, ready to hand to an email tool. */
  async exportCsv(siteId: string): Promise<string> {
    const rows = await this.db.forSite(siteId, (tx) =>
      tx.subscriber.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: MAX_EXPORT,
      }),
    );
    return subscribersToCsv(rows.map(toSubscriber));
  }
}

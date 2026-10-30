import { Injectable, Logger } from '@nestjs/common';
import {
  periodEndFor,
  readerListQuerySchema,
  type MembershipInterval,
  type MembershipPlan,
  type MembershipPlanInput,
  type MembershipReader,
  type MembershipReaderList,
  type MembershipSummary,
  type PublicMembershipPlan,
  type ReaderListQuery,
  type ReaderSubscriptionStatus,
  type ReaderSubscriptionView,
  type UpdateMembershipPlanInput,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import type { StripeEvent } from '../billing/stripe';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  readReaderSubscriptionEvent,
  setStripeCancelAtPeriodEnd,
} from './stripe-membership';

const asInterval = (value: string): MembershipInterval => (value === 'year' ? 'year' : 'month');

const asStatus = (value: string): ReaderSubscriptionStatus =>
  value === 'past_due' || value === 'cancelled' || value === 'expired' ? value : 'active';

const toPlan = (row: {
  id: string;
  name: string;
  description: string;
  interval: string;
  price: number;
  currency: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): MembershipPlan => ({
  id: row.id,
  name: row.name,
  description: row.description,
  interval: asInterval(row.interval),
  price: row.price,
  currency: row.currency,
  status: row.status === 'paused' ? 'paused' : 'active',
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const subscriptionView = (subscription: {
  planId: string | null;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  plan: { name: string; interval: string } | null;
}): ReaderSubscriptionView => ({
  planId: subscription.planId,
  planName: subscription.plan?.name ?? null,
  interval: subscription.plan ? asInterval(subscription.plan.interval) : null,
  status: asStatus(subscription.status),
  currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
  cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
});

/**
 * Plans, readers and revenue of one site (docs/PROGRESS.md batch A). Every query
 * runs under the site's RLS context, so a plan or reader of another tenant can
 * never be reached by guessing an id.
 */
@Injectable()
export class MembershipService {
  private readonly logger = new Logger(MembershipService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async plans(siteId: string): Promise<MembershipPlan[]> {
    const rows = await this.db.forSite(siteId, (tx) =>
      tx.membershipPlan.findMany({ orderBy: [{ createdAt: 'asc' }] }),
    );
    return rows.map(toPlan);
  }

  async createPlan(
    siteId: string,
    input: MembershipPlanInput,
    actorId: string,
  ): Promise<MembershipPlan> {
    const created = await this.db.forSite(siteId, (tx) =>
      tx.membershipPlan.create({
        data: {
          siteId,
          name: input.name,
          description: input.description,
          interval: input.interval,
          price: input.price,
          status: input.status,
        },
      }),
    );

    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'membership.plan.create',
      target: created.id,
      meta: { name: created.name, price: created.price },
    });
    return toPlan(created);
  }

  async updatePlan(
    siteId: string,
    planId: string,
    input: UpdateMembershipPlanInput,
    actorId: string,
  ): Promise<MembershipPlan> {
    const updated = await this.db.forSite(siteId, async (tx) => {
      const existing = await tx.membershipPlan.findFirst({ where: { id: planId, siteId } });
      if (!existing) throw ApiException.notFound('ไม่พบแพ็กเกจนี้');
      return tx.membershipPlan.update({
        where: { id: planId },
        data: {
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.description === undefined ? {} : { description: input.description }),
          ...(input.interval === undefined ? {} : { interval: input.interval }),
          ...(input.price === undefined ? {} : { price: input.price }),
          ...(input.status === undefined ? {} : { status: input.status }),
        },
      });
    });

    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'membership.plan.update',
      target: planId,
      meta: { fields: Object.keys(input) },
    });
    return toPlan(updated);
  }

  /** A plan with members is paused instead of deleted, so their access survives. */
  async deletePlan(siteId: string, planId: string, actorId: string): Promise<void> {
    await this.db.forSite(siteId, async (tx) => {
      const plan = await tx.membershipPlan.findFirst({ where: { id: planId, siteId } });
      if (!plan) throw ApiException.notFound('ไม่พบแพ็กเกจนี้');

      const subscribers = await tx.readerSubscription.count({ where: { planId } });
      if (subscribers > 0) {
        throw ApiException.conflict(
          'แพ็กเกจนี้มีสมาชิกอยู่ กรุณาหยุดขายชั่วคราวแทนการลบ เพื่อไม่ให้สมาชิกเสียสิทธิ์',
        );
      }
      await tx.membershipPlan.delete({ where: { id: planId } });
    });

    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'membership.plan.delete',
      target: planId,
    });
  }

  async readers(siteId: string, query: ReaderListQuery): Promise<MembershipReaderList> {
    const input = readerListQuerySchema.parse(query);
    const search = input.q?.trim() ?? '';

    const rows = await this.db.forSite(siteId, (tx) =>
      tx.reader.findMany({
        where: search
          ? {
              OR: [
                { email: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
        orderBy: { createdAt: 'desc' },
        take: input.limit ?? 50,
        include: {
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { plan: { select: { name: true, interval: true } } },
          },
        },
      }),
    );

    const items: MembershipReader[] = rows
      .map((row) => {
        const subscription = row.subscriptions[0] ?? null;
        return {
          id: row.id,
          email: row.email,
          name: row.name,
          emailVerified: !!row.verifiedAt,
          joinedAt: row.createdAt.toISOString(),
          subscription: subscription ? subscriptionView(subscription) : null,
        };
      })
      .filter((reader) => (input.status ? reader.subscription?.status === input.status : true));

    const total = await this.db.forSite(siteId, (tx) => tx.reader.count());
    return { items, total };
  }

  /** Members and recurring revenue, with yearly plans spread over twelve months. */
  async summary(siteId: string): Promise<MembershipSummary> {
    const now = new Date();
    const [readers, plans, active] = await this.db.forSite(siteId, async (tx) =>
      Promise.all([
        tx.reader.count(),
        tx.membershipPlan.count(),
        tx.readerSubscription.findMany({
          where: { status: 'active', currentPeriodEnd: { gt: now } },
          include: { plan: { select: { price: true, interval: true } } },
        }),
      ]),
    );

    const mrr = active.reduce((sum, subscription) => {
      const price = subscription.plan?.price ?? 0;
      return sum + (subscription.plan?.interval === 'year' ? Math.round(price / 12) : price);
    }, 0);

    return {
      readers,
      activeMembers: active.length,
      mrr,
      currency: 'THB',
      plans,
    };
  }

  /**
   * Stops the next renewal (the paid period stays) or resumes it. The local row
   * is only updated after Stripe accepted the change.
   */
  async cancelSubscription(
    siteId: string,
    subscriptionId: string,
    cancel: boolean,
    actorId: string,
  ): Promise<ReaderSubscriptionView> {
    const subscription = await this.db.forSite(siteId, (tx) =>
      tx.readerSubscription.findFirst({
        where: { id: subscriptionId },
        include: { plan: { select: { name: true, interval: true } } },
      }),
    );
    if (!subscription) throw ApiException.notFound('ไม่พบการเป็นสมาชิกนี้');
    if (subscription.status !== 'active' && cancel) {
      throw ApiException.conflict('การเป็นสมาชิกนี้สิ้นสุดแล้ว');
    }

    if (subscription.stripeSubscriptionId) {
      await setStripeCancelAtPeriodEnd(fetch, subscription.stripeSubscriptionId, cancel);
    }

    const updated = await this.db.forSite(siteId, (tx) =>
      tx.readerSubscription.update({
        where: { id: subscriptionId },
        data: { cancelAtPeriodEnd: cancel },
        include: { plan: { select: { name: true, interval: true } } },
      }),
    );

    await this.audit.log({
      siteId,
      userId: actorId,
      action: cancel ? 'membership.cancel' : 'membership.resume',
      target: subscriptionId,
    });
    return subscriptionView(updated);
  }

  /** Active plans the public site may offer, e.g. on a locked page. */
  async publicPlans(siteId: string): Promise<PublicMembershipPlan[]> {
    const rows = await this.db.forSite(siteId, (tx) =>
      tx.membershipPlan.findMany({
        where: { status: 'active' },
        orderBy: [{ interval: 'asc' }, { price: 'asc' }],
        select: { id: true, name: true, description: true, interval: true, price: true, currency: true },
      }),
    );
    return rows.map((row) => ({ ...row, interval: asInterval(row.interval) }));
  }

  /**
   * Keeps one subscription row in step with Stripe. The event arrives from a
   * verified webhook; events about another site's subscription are ignored.
   */
  async handleStripeEvent(event: StripeEvent): Promise<{ handled: boolean }> {
    const patch = readReaderSubscriptionEvent(event);
    if (!patch?.siteId) return { handled: false };
    const siteId = patch.siteId;

    const handled = await this.db.forSite(siteId, async (tx) => {
      const existing = patch.stripeSubscriptionId
        ? await tx.readerSubscription.findUnique({
            where: { stripeSubscriptionId: patch.stripeSubscriptionId },
          })
        : null;

      if (existing) {
        await tx.readerSubscription.update({
          where: { id: existing.id },
          data: {
            ...(patch.status ? { status: patch.status } : {}),
            ...(patch.currentPeriodEnd ? { currentPeriodEnd: patch.currentPeriodEnd } : {}),
            ...(patch.cancelAtPeriodEnd === null
              ? {}
              : { cancelAtPeriodEnd: patch.cancelAtPeriodEnd }),
            ...(patch.stripeCustomerId ? { stripeCustomerId: patch.stripeCustomerId } : {}),
            ...(patch.planId ? { planId: patch.planId } : {}),
          },
        });
        return true;
      }

      // A brand-new subscription: only the checkout event carries the plan and
      // the reader, so anything else is for a row we have not created yet. A
      // delayed payment settles with the async event, so both may create it.
      const fromCheckout =
        event.type === 'checkout.session.completed' ||
        event.type === 'checkout.session.async_payment_succeeded';
      if (!fromCheckout || !patch.readerId || !patch.planId) {
        return false;
      }

      const plan = await tx.membershipPlan.findFirst({
        where: { id: patch.planId, siteId },
        select: { interval: true },
      });
      const reader = await tx.reader.findFirst({
        where: { id: patch.readerId, siteId },
        select: { id: true },
      });
      if (!plan || !reader) return false;

      await tx.readerSubscription.create({
        data: {
          siteId,
          readerId: patch.readerId,
          planId: patch.planId,
          status: 'active',
          currentPeriodEnd: periodEndFor(asInterval(plan.interval)),
          stripeSubscriptionId: patch.stripeSubscriptionId,
          stripeCustomerId: patch.stripeCustomerId,
        },
      });
      return true;
    });

    return { handled };
  }
}

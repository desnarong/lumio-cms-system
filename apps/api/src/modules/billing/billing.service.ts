import { Injectable, Optional } from '@nestjs/common';
import { Prisma, type Invoice as InvoiceRow } from '@prisma/client';
import {
  BILLING_CURRENCY,
  checkoutSessionSchema,
  findPlan,
  planFeatures,
  planLabel,
  PLAN_DEFINITIONS,
  prorationCreditFor,
  prorationQuote,
  type ApiLocale,
  type BillingSubscription,
  type BillingSummary,
  type CheckoutInput,
  type CheckoutSession,
  type Invoice,
  type PlanOption,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { CommerceService } from '../commerce/commerce.service';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import type { StripeEvent } from './stripe';

const toInvoice = (row: InvoiceRow, locale: ApiLocale): Invoice => ({
  id: row.id,
  plan: row.plan,
  planLabel: planLabel(row.plan, locale),
  amount: row.amount,
  currency: row.currency,
  status: row.status === 'paid' || row.status === 'void' ? row.status : 'pending',
  periodStart: row.periodStart.toISOString(),
  periodEnd: row.periodEnd.toISOString(),
  issuedAt: row.issuedAt.toISOString(),
  paidAt: row.paidAt ? row.paidAt.toISOString() : null,
  method: row.method === 'card' || row.method === 'promptpay' ? row.method : null,
  credit: row.credit ?? 0,
});

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};

const planOptions = (current: string, locale: ApiLocale, credit = 0): PlanOption[] =>
  PLAN_DEFINITIONS.map((definition) => {
    const quote = definition.id === current ? { credit: 0, payable: definition.price } : prorationQuote(definition.price, credit);
    return {
      id: definition.id,
      label: planLabel(definition.id, locale),
      price: definition.price,
      currency: BILLING_CURRENCY,
      quota: definition.quota,
      features: planFeatures(definition.id, locale),
      current: definition.id === current,
      credit: quote.credit,
      payable: quote.payable,
    };
  });

/**
 * Plan, quota usage and invoice history for one site (docs/design/18-deployment.md
 * 18.6-18.7, 05-admin-ia.md "ตั้งค่า › แพ็กเกจ & การชำระเงิน"). Usage is measured
 * from the site's own rows; only the owner may read or change it (13-rbac.md).
 */
@Injectable()
export class BillingService {
  constructor(
    private readonly db: PrismaService,
    private readonly stripe: StripeService = new StripeService(),
    @Optional() private readonly commerce?: CommerceService,
  ) {}

  async summary(siteId: string, locale: ApiLocale = 'th'): Promise<BillingSummary> {
    const data = await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({
        where: { id: siteId },
        select: { plan: true, stripeSubscriptionId: true, settings: true },
      });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');

      const pages = await tx.content.count({
        where: { type: 'page', status: { not: 'archived' } },
      });
      const media = await tx.media.aggregate({
        _sum: { sizeBytes: true },
        where: { status: { not: 'trashed' } },
      });
      const team = await tx.siteMember.count();
      const invoices = await tx.invoice.findMany({
        orderBy: [{ issuedAt: 'desc' }, { id: 'desc' }],
        take: 24,
      });

      const billing = asRecord(asRecord(site.settings).billing);
      const subscription: BillingSubscription | null = site.stripeSubscriptionId
        ? {
            renewsAt: typeof billing.renewsAt === 'string' ? billing.renewsAt : null,
            cancelAtPeriodEnd: billing.cancelAtPeriodEnd === true,
            method: billing.method === 'promptpay' ? 'promptpay' : 'card',
          }
        : null;

      // The credit a switch would carry comes from the last paid period, so the
      // screen can show the real amount before the owner opens Stripe.
      const paid = invoices.find((row) => row.status === 'paid');
      const credit = paid
        ? prorationCreditFor({
            price: findPlan(site.plan).price,
            periodStart: paid.periodStart,
            periodEnd: paid.periodEnd,
          })
        : 0;

      return {
        plan: site.plan,
        credit,
        usage: {
          pages,
          mediaBytes: Number(media._sum.sizeBytes ?? 0),
          team,
        },
        invoices: invoices.map((row) => toInvoice(row, locale)),
        subscription,
      };
    });

    const definition = findPlan(data.plan);
    return {
      plan: data.plan,
      planLabel: planLabel(data.plan, locale),
      price: definition.price,
      currency: BILLING_CURRENCY,
      quota: definition.quota,
      usage: data.usage,
      plans: planOptions(data.plan, locale, data.credit),
      invoices: data.invoices,
      subscription: data.subscription,
    };
  }

  /** Unused time on the paid period of the plan the site is on right now. */
  private async creditForSite(siteId: string): Promise<{ plan: string; credit: number }> {
    return this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({ where: { id: siteId }, select: { plan: true } });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');

      const paid = await tx.invoice.findFirst({
        where: { status: 'paid' },
        orderBy: [{ paidAt: 'desc' }, { issuedAt: 'desc' }],
        select: { periodStart: true, periodEnd: true },
      });
      const credit = paid
        ? prorationCreditFor({
            price: findPlan(site.plan).price,
            periodStart: paid.periodStart,
            periodEnd: paid.periodEnd,
          })
        : 0;
      return { plan: site.plan, credit };
    });
  }

  async changePlan(
    siteId: string,
    plan: string,
    actorId: string,
    locale: ApiLocale = 'th',
  ): Promise<BillingSummary> {
    const definition = findPlan(plan);
    if (definition.price === null) {
      throw ApiException.conflict('แพ็กเกจนี้ต้องติดต่อฝ่ายขาย');
    }
    // Paid plans go through Stripe Checkout; this call only moves a site onto the
    // free plan (a downgrade), so nobody can unlock a paid plan for free.
    if (definition.price !== 0) {
      throw ApiException.conflict('แพ็กเกจนี้ต้องชำระเงินก่อน ใช้ปุ่มชำระเงินในหน้านี้');
    }

    await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({ where: { id: siteId }, select: { plan: true } });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
      if (site.plan === plan) throw ApiException.conflict('เว็บนี้ใช้แพ็กเกจนี้อยู่แล้ว');

      await tx.site.update({ where: { id: siteId }, data: { plan } });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'billing.change_plan',
          target: siteId,
          meta: { plan, from: site.plan },
        },
      });
    });

    return this.summary(siteId, locale);
  }

  /**
   * Starts a Stripe Checkout for a paid plan (card or PromptPay). The unused time
   * on the current plan is taken off the price first; when it covers the whole
   * switch there is nothing to pay and the plan changes right away.
   */
  async startCheckout(
    siteId: string,
    input: CheckoutInput,
    actorId: string,
    locale: ApiLocale = 'th',
    email: string | null = null,
  ): Promise<CheckoutSession> {
    const definition = findPlan(input.plan);
    if (definition.price === null) {
      throw ApiException.conflict('แพ็กเกจนี้ต้องติดต่อฝ่ายขาย');
    }
    if (definition.price === 0) {
      throw ApiException.conflict('แพ็กเกจฟรีไม่ต้องชำระเงิน เลือกแพ็กเกจนี้ได้เลย');
    }

    const { plan: currentPlan, credit } = await this.creditForSite(siteId);
    if (currentPlan === input.plan) {
      throw ApiException.conflict('เว็บนี้ใช้แพ็กเกจนี้อยู่แล้ว');
    }
    const quote = prorationQuote(definition.price, credit);
    const amount = quote.payable ?? definition.price;

    if (amount === 0) {
      const invoiceId = await this.switchCoveredByCredit(
        siteId,
        input,
        actorId,
        quote.credit,
      );
      return checkoutSessionSchema.parse({
        url: '#',
        sessionId: 'proration',
        invoiceId,
        method: input.method,
        paid: true,
      });
    }

    if (!this.stripe.configured()) {
      throw ApiException.conflict(
        'ยังไม่ได้เชื่อมต่อ Stripe กรุณาตั้งค่า STRIPE_SECRET_KEY ก่อนรับชำระเงิน',
      );
    }

    const invoiceId = await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({ where: { id: siteId }, select: { plan: true } });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
      if (site.plan === input.plan) throw ApiException.conflict('เว็บนี้ใช้แพ็กเกจนี้อยู่แล้ว');

      const periodStart = new Date();
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const invoice = await tx.invoice.create({
        data: {
          siteId,
          plan: input.plan,
          amount,
          credit: quote.credit,
          currency: BILLING_CURRENCY,
          status: 'pending',
          periodStart,
          periodEnd,
          provider: 'stripe',
          method: input.method,
        },
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'billing.checkout_started',
          target: invoice.id,
          meta: { plan: input.plan, method: input.method, credit: quote.credit, amount },
        },
      });

      return invoice.id;
    });

    const session = await this.stripe.createCheckout({
      plan: input.plan,
      planLabel: planLabel(input.plan, locale),
      // A card subscription keeps the plan price and takes the credit off the
      // first invoice with a one-time coupon; PromptPay pays once, so the credit
      // is already subtracted from the amount.
      amount: input.method === 'card' ? definition.price : amount,
      credit: input.method === 'card' ? quote.credit : 0,
      method: input.method,
      mode: input.method === 'card' ? 'subscription' : 'payment',
      invoiceId,
      siteId,
      email,
    });

    await this.db.forSite(siteId, (tx) =>
      tx.invoice.update({ where: { id: invoiceId }, data: { providerRef: session.id } }),
    );

    return checkoutSessionSchema.parse({
      url: session.url,
      sessionId: session.id,
      invoiceId,
      method: input.method,
      paid: false,
    });
  }

  /**
   * The unused time on the old plan covered the new one, so no payment page is
   * opened: a zero invoice is recorded, the plan moves, and any subscription for
   * the old plan is cancelled (it would keep renewing the old price).
   */
  private async switchCoveredByCredit(
    siteId: string,
    input: CheckoutInput,
    actorId: string,
    credit: number,
  ): Promise<string> {
    let replacedSubscription: string | null = null;

    const invoiceId = await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({
        where: { id: siteId },
        select: { plan: true, stripeSubscriptionId: true },
      });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
      if (site.plan === input.plan) throw ApiException.conflict('เว็บนี้ใช้แพ็กเกจนี้อยู่แล้ว');
      replacedSubscription = site.stripeSubscriptionId;

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const invoice = await tx.invoice.create({
        data: {
          siteId,
          plan: input.plan,
          amount: 0,
          credit,
          currency: BILLING_CURRENCY,
          status: 'paid',
          periodStart: now,
          periodEnd,
          paidAt: now,
          provider: 'proration',
          method: input.method,
        },
      });

      await tx.invoice.updateMany({
        where: { status: 'pending', id: { not: invoice.id } },
        data: { status: 'void' },
      });
      await tx.site.update({
        where: { id: siteId },
        data: { plan: input.plan, stripeSubscriptionId: null },
      });
      await this.writeBillingSettings(tx, siteId, {
        renewsAt: null,
        cancelAtPeriodEnd: false,
        method: input.method,
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'billing.proration_switch',
          target: invoice.id,
          meta: { plan: input.plan, from: site.plan, credit },
        },
      });

      return invoice.id;
    });

    if (replacedSubscription) {
      await this.cancelReplacedSubscription(siteId, replacedSubscription);
    }
    return invoiceId;
  }

  /**
   * Applies a verified Stripe event. Cards are paid when the session completes;
   * PromptPay completes with  first and is confirmed
   * later by . Expired or failed
   * sessions void the invoice, so the owner is never charged twice for it.
   */
  async handleStripeEvent(
    event: StripeEvent,
  ): Promise<{ handled: boolean; invoiceId: string | null }> {
    if (event.type.startsWith('invoice.') || event.type.startsWith('customer.subscription.')) {
      return this.handleSubscriptionEvent(event);
    }

    const session = event.data.object;
    const metadata =
      session.metadata !== null && typeof session.metadata === 'object'
        ? (session.metadata as Record<string, unknown>)
        : {};
    const invoiceId =
      typeof session.client_reference_id === 'string'
        ? session.client_reference_id
        : typeof metadata.invoiceId === 'string'
          ? metadata.invoiceId
          : null;
    const siteId = typeof metadata.siteId === 'string' ? metadata.siteId : null;
    if (!invoiceId || !siteId) return { handled: false, invoiceId };

    const paid =
      event.type === 'checkout.session.async_payment_succeeded' ||
      (event.type === 'checkout.session.completed' && session.payment_status === 'paid');
    const failed =
      event.type === 'checkout.session.async_payment_failed' ||
      event.type === 'checkout.session.expired';
    if (!paid && !failed) return { handled: false, invoiceId };

    const orderNumber =
      typeof metadata.orderNumber === 'string' ? metadata.orderNumber : null;
    if (orderNumber && this.commerce) {
      if (!paid) return { handled: false, invoiceId: null };
      const handled = await this.commerce.markOrderPaidByNumber(
        siteId,
        orderNumber,
        typeof session.id === 'string' ? session.id : null,
      );
      return { handled, invoiceId: null };
    }

    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
    const customerId = typeof session.customer === 'string' ? session.customer : null;

    let handled = false;
    let replacedSubscription: string | null = null;
    await this.db.forSite(siteId, async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) return;
      if (invoice.status === 'paid') return;

      if (paid) {
        const site = await tx.site.findUnique({
          where: { id: siteId },
          select: { stripeSubscriptionId: true },
        });
        // Switching plans starts a new subscription; remember the old one so it
        // can be cancelled below instead of renewing in parallel.
        if (site?.stripeSubscriptionId && site.stripeSubscriptionId !== subscriptionId) {
          replacedSubscription = site.stripeSubscriptionId;
        }

        await tx.invoice.update({
          where: { id: invoiceId },
          data: { status: 'paid', paidAt: new Date() },
        });
        // Abandoned checkouts leave pending rows behind; they are no longer owed.
        await tx.invoice.updateMany({
          where: { status: 'pending', id: { not: invoiceId } },
          data: { status: 'void' },
        });
        await tx.site.update({
          where: { id: siteId },
          data: {
            plan: invoice.plan,
            ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
            ...(customerId ? { stripeCustomerId: customerId } : {}),
          },
        });
        if (subscriptionId) {
          await this.writeBillingSettings(tx, siteId, {
            method: 'card',
            cancelAtPeriodEnd: false,
          });
        }
        await tx.auditLog.create({
          data: {
            siteId,
            userId: null,
            action: 'billing.paid',
            target: invoiceId,
            meta: {
              plan: invoice.plan,
              amount: invoice.amount,
              method: invoice.method,
              subscription: subscriptionId,
            },
          },
        });
        handled = true;
        return;
      }

      await tx.invoice.update({ where: { id: invoiceId }, data: { status: 'void' } });
      await tx.auditLog.create({
        data: {
          siteId,
          userId: null,
          action: 'billing.payment_failed',
          target: invoiceId,
          meta: { plan: invoice.plan, event: event.type },
        },
      });
      handled = true;
    });

    if (handled && replacedSubscription) {
      await this.cancelReplacedSubscription(siteId, replacedSubscription);
    }

    return { handled, invoiceId };
  }

  /** Stops the plan the owner just replaced; a failure is recorded, not thrown. */
  private async cancelReplacedSubscription(
    siteId: string,
    subscriptionId: string,
  ): Promise<void> {
    try {
      await this.stripe.cancelNow(subscriptionId);
      await this.db.forSite(siteId, (tx) =>
        tx.auditLog.create({
          data: {
            siteId,
            userId: null,
            action: 'billing.replaced_subscription_cancelled',
            target: subscriptionId,
            meta: {},
          },
        }),
      );
    } catch (error) {
      await this.db.forSite(siteId, (tx) =>
        tx.auditLog.create({
          data: {
            siteId,
            userId: null,
            action: 'billing.replaced_subscription_cancel_failed',
            target: subscriptionId,
            meta: { reason: error instanceof Error ? error.message : 'unknown' },
          },
        }),
      );
    }
  }

  /**
   * Renewals and cancellations for a card subscription. Stripe's renewal
   * invoices do not carry our metadata, so the site is found by the subscription
   * id stored on it; every write is scoped to that site.
   */
  private async handleSubscriptionEvent(
    event: StripeEvent,
  ): Promise<{ handled: boolean; invoiceId: string | null }> {
    const object = event.data.object;
    const parent = asRecord(object.parent);
    const details = asRecord(parent.subscription_details);
    const subscriptionId =
      typeof object.subscription === 'string'
        ? object.subscription
        : typeof details.subscription === 'string'
          ? details.subscription
          : event.type.startsWith('customer.subscription.') && typeof object.id === 'string'
            ? object.id
            : null;
    if (!subscriptionId) return { handled: false, invoiceId: null };

    const site = await this.db.site.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
      select: { id: true, plan: true },
    });
    if (!site) return { handled: false, invoiceId: null };

    if (event.type === 'customer.subscription.deleted') {
      await this.db.forSite(site.id, async (tx) => {
        await tx.site.update({
          where: { id: site.id },
          data: { plan: 'free', stripeSubscriptionId: null },
        });
        await this.writeBillingSettings(tx, site.id, {
          renewsAt: null,
          cancelAtPeriodEnd: false,
        });
        await tx.auditLog.create({
          data: {
            siteId: site.id,
            userId: null,
            action: 'billing.subscription_ended',
            target: subscriptionId,
            meta: { plan: site.plan },
          },
        });
      });
      return { handled: true, invoiceId: null };
    }

    if (event.type === 'customer.subscription.updated') {
      await this.db.forSite(site.id, (tx) =>
        this.writeBillingSettings(tx, site.id, {
          renewsAt:
            typeof object.current_period_end === 'number'
              ? new Date(object.current_period_end * 1000).toISOString()
              : null,
          cancelAtPeriodEnd: object.cancel_at_period_end === true,
        }),
      );
      return { handled: true, invoiceId: null };
    }

    const stripeInvoiceId = typeof object.id === 'string' ? object.id : null;
    if (!stripeInvoiceId) return { handled: false, invoiceId: null };

    const existing = await this.db.forSite(site.id, (tx) =>
      tx.invoice.findFirst({ where: { providerRef: stripeInvoiceId }, select: { id: true } }),
    );
    if (existing) return { handled: true, invoiceId: existing.id };

    const periodStart =
      typeof object.period_start === 'number'
        ? new Date(object.period_start * 1000)
        : new Date();
    const periodEnd =
      typeof object.period_end === 'number'
        ? new Date(object.period_end * 1000)
        : new Date(periodStart.getTime() + 30 * 24 * 60 * 60 * 1000);
    const amountMinor =
      typeof object.amount_paid === 'number'
        ? object.amount_paid
        : typeof object.amount_due === 'number'
          ? object.amount_due
          : (findPlan(site.plan).price ?? 0) * 100;
    const failed = event.type === 'invoice.payment_failed';

    if (event.type === 'invoice.paid') {
      const reason = typeof object.billing_reason === 'string' ? object.billing_reason : '';
      // The first charge is already covered by the checkout session event.
      if (reason === 'subscription_create') return { handled: true, invoiceId: null };
    } else if (!failed) {
      return { handled: false, invoiceId: null };
    }

    const created = await this.db.forSite(site.id, (tx) =>
      tx.invoice.create({
        data: {
          siteId: site.id,
          plan: site.plan,
          amount: Math.round(amountMinor / 100),
          currency: BILLING_CURRENCY,
          status: failed ? 'void' : 'paid',
          periodStart,
          periodEnd,
          paidAt: failed ? null : new Date(),
          provider: 'stripe',
          providerRef: stripeInvoiceId,
          method: 'card',
        },
      }),
    );

    await this.db.forSite(site.id, async (tx) => {
      await this.writeBillingSettings(tx, site.id, {
        renewsAt: periodEnd.toISOString(),
        cancelAtPeriodEnd: false,
      });
      await tx.auditLog.create({
        data: {
          siteId: site.id,
          userId: null,
          action: failed ? 'billing.renewal_failed' : 'billing.renewed',
          target: created.id,
          meta: { plan: site.plan, periodEnd: periodEnd.toISOString() },
        },
      });
    });

    return { handled: true, invoiceId: created.id };
  }

  /** Stops the next charge; the plan the owner paid for stays until then. */
  async cancelSubscription(
    siteId: string,
    actorId: string,
    locale: ApiLocale = 'th',
  ): Promise<BillingSummary> {
    const site = await this.db.site.findUnique({
      where: { id: siteId },
      select: { stripeSubscriptionId: true },
    });
    if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
    if (!site.stripeSubscriptionId) {
      throw ApiException.conflict(
        'เว็บนี้ไม่มีการต่ออายุอัตโนมัติ (พร้อมเพย์ชำระครั้งเดียว) จึงไม่ต้องยกเลิก',
      );
    }

    const canceled = await this.stripe.cancel(site.stripeSubscriptionId);
    await this.db.forSite(siteId, async (tx) => {
      await this.writeBillingSettings(tx, siteId, {
        cancelAtPeriodEnd: true,
        ...(canceled.currentPeriodEnd
          ? { renewsAt: new Date(canceled.currentPeriodEnd).toISOString() }
          : {}),
      });
      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'billing.cancel_renewal',
          target: site.stripeSubscriptionId,
          meta: { cancelAtPeriodEnd: true },
        },
      });
    });

    return this.summary(siteId, locale);
  }

  /** Merges one patch into the site billing settings, so renewals survive a reload. */
  private async writeBillingSettings(
    tx: Prisma.TransactionClient,
    siteId: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    const site = await tx.site.findUnique({ where: { id: siteId }, select: { settings: true } });
    if (!site) return;

    const settings = asRecord(site.settings);
    const billing = { ...asRecord(settings.billing), ...patch };
    await tx.site.update({
      where: { id: siteId },
      data: { settings: { ...settings, billing } as Prisma.InputJsonObject },
    });
  }
}

import { describe, expect, it, vi, type Mock } from 'vitest';
import { prorationCreditFor } from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import type { PrismaService } from '../prisma/prisma.service';
import { BillingService } from './billing.service';
import type { StripeEvent } from './stripe';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';

interface Options {
  plan?: string;
  pages?: number;
  mediaBytes?: number;
  team?: number;
  /** Existing Stripe subscription id (for plan-switch tests). */
  subscription?: string;
  /** A paid period on the current plan, for proration tests. */
  paidPeriod?: { start: Date; end: Date; amount?: number };
}

interface Stubs {
  db: PrismaService;
  create: Mock;
  update: Mock;
  updateMany: Mock;
  audit: Mock;
}

const stubs = (options: Options = {}): Stubs => {
  const state = {
    plan: options.plan ?? 'free',
    subscriptionId: (options.subscription ?? null) as string | null,
    settings: {} as Record<string, unknown>,
    invoices: [] as Record<string, unknown>[],
  };
  if (options.paidPeriod) {
    state.invoices.push({
      id: 'inv-paid',
      plan: state.plan,
      amount: options.paidPeriod.amount ?? 0,
      credit: 0,
      currency: 'THB',
      status: 'paid',
      periodStart: options.paidPeriod.start,
      periodEnd: options.paidPeriod.end,
      issuedAt: options.paidPeriod.start,
      paidAt: options.paidPeriod.start,
      method: 'card',
      provider: 'stripe',
      providerRef: 'in_paid',
    });
  }
  const create = vi.fn();
  const update = vi.fn();
  const audit = vi.fn();

  const tx = {
    site: {
      findUnique: vi.fn(async () => ({
        plan: state.plan,
        stripeSubscriptionId: state.subscriptionId,
        settings: state.settings,
      })),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        if (typeof data.plan === 'string') state.plan = data.plan;
        if (data.stripeSubscriptionId !== undefined) {
          state.subscriptionId = data.stripeSubscriptionId as string | null;
        }
        if (data.settings !== undefined) state.settings = data.settings as Record<string, unknown>;
        update(data);
        return { id: SITE_ID };
      }),
    },
    content: { count: vi.fn(async () => options.pages ?? 0) },
    media: {
      aggregate: vi.fn(async () => ({ _sum: { sizeBytes: BigInt(options.mediaBytes ?? 0) } })),
    },
    siteMember: { count: vi.fn(async () => options.team ?? 1) },
    invoice: {
      findMany: vi.fn(async () => state.invoices),
      findUnique: vi.fn(
        async ({ where }: { where: { id: string } }) =>
          state.invoices.find((row) => row.id === where.id) ?? null,
      ),
      findFirst: vi.fn(
        async ({ where }: { where: { providerRef?: string; status?: string } }) => {
          if (where.status) {
            return state.invoices.find((row) => row.status === where.status) ?? null;
          }
          return state.invoices.find((row) => row.providerRef === where.providerRef) ?? null;
        },
      ),
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const row = state.invoices.find((entry) => entry.id === where.id);
          if (row) Object.assign(row, data);
          return row ?? null;
        },
      ),
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { status: string; id: { not: string } };
          data: Record<string, unknown>;
        }) => {
          let count = 0;
          for (const row of state.invoices) {
            if (row.status !== where.status || row.id === where.id.not) continue;
            Object.assign(row, data);
            count += 1;
          }
          return { count };
        },
      ),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: `inv-${state.invoices.length + 1}`,
          issuedAt: new Date('2026-10-21T00:00:00.000Z'),
          paidAt: null,
          ...data,
        };
        state.invoices = [row, ...state.invoices];
        create(data);
        return row;
      }),
    },
    auditLog: { create: vi.fn(async ({ data }: { data: unknown }) => audit(data)) },
  };

  const db = {
    site: {
      findUnique: vi.fn(async () => ({ stripeSubscriptionId: state.subscriptionId })),
      findFirst: vi.fn(
        async ({ where }: { where: { stripeSubscriptionId: string } }) =>
          state.subscriptionId === where.stripeSubscriptionId
            ? { id: SITE_ID, plan: state.plan }
            : null,
      ),
    },
    forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx)),
  } as unknown as PrismaService;

  return { db, create, update, updateMany: tx.invoice.updateMany, audit };
};


const stripeStub = (configured = true) => ({
  configured: () => configured,
  createCheckout: vi.fn().mockResolvedValue({
    id: 'cs_test_1',
    url: 'https://checkout.stripe.com/c/pay/cs_test_1',
  }),
});

const stripeEvent = (
  type: string,
  overrides: Record<string, unknown> = {},
): StripeEvent => ({
  id: 'evt_1',
  type,
  data: {
    object: {
      id: 'cs_test_1',
      client_reference_id: 'inv-1',
      payment_status: 'paid',
      metadata: { siteId: SITE_ID, plan: 'pro' },
      ...overrides,
    },
  },
});

describe('BillingService.startCheckout', () => {
  it('opens a pending invoice and answers with the Stripe page', async () => {
    const { db, create } = stubs({ plan: 'free' });
    const stripe = stripeStub();

    const session = await new BillingService(db, stripe as never).startCheckout(
      SITE_ID,
      { plan: 'pro', method: 'promptpay' },
      'user-1',
    );

    expect(create.mock.calls[0]?.[0]).toMatchObject({
      plan: 'pro',
      amount: 499,
      status: 'pending',
      provider: 'stripe',
      method: 'promptpay',
    });
    expect(stripe.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ plan: 'pro', method: 'promptpay', invoiceId: 'inv-1' }),
    );
    expect(session).toEqual({
      url: 'https://checkout.stripe.com/c/pay/cs_test_1',
      sessionId: 'cs_test_1',
      invoiceId: 'inv-1',
      method: 'promptpay',
      paid: false,
    });
  });

  it('explains that Stripe is not connected yet', async () => {
    const { db } = stubs({ plan: 'free' });

    await expect(
      new BillingService(db, stripeStub(false) as never).startCheckout(
        SITE_ID,
        { plan: 'pro', method: 'card' },
        'user-1',
      ),
    ).rejects.toThrow(/STRIPE_SECRET_KEY/);
  });

  it('never sends the free plan to a payment page', async () => {
    const { db } = stubs({ plan: 'starter' });

    await expect(
      new BillingService(db, stripeStub() as never).startCheckout(
        SITE_ID,
        { plan: 'free', method: 'card' },
        'user-1',
      ),
    ).rejects.toThrow(/ไม่ต้องชำระเงิน/);
  });
});

describe('BillingService.handleStripeEvent', () => {
  const checkout = async (stripe: ReturnType<typeof stripeStub>, plan = 'pro') => {
    const all = stubs({ plan: 'free' });
    await new BillingService(all.db, stripe as never).startCheckout(
      SITE_ID,
      { plan: plan as 'pro', method: 'promptpay' },
      'user-1',
    );
    return all;
  };

  it('marks the invoice paid and moves the site onto the plan', async () => {
    const stripe = stripeStub();
    const { db, update, audit } = await checkout(stripe);
    const billing = new BillingService(db, stripe as never);

    const result = await billing.handleStripeEvent(stripeEvent('checkout.session.completed'));

    expect(result).toEqual({ handled: true, invoiceId: 'inv-1' });
    expect(update).toHaveBeenCalledWith({ plan: 'pro' });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'billing.paid', target: 'inv-1' }),
    );

    // Stripe retries; a second delivery must not change anything.
    await billing.handleStripeEvent(stripeEvent('checkout.session.completed'));
    expect(audit.mock.calls.filter(([data]) => data.action === 'billing.paid')).toHaveLength(1);
  });

  it('waits for PromptPay and confirms it with the async event', async () => {
    const stripe = stripeStub();
    const { db } = await checkout(stripe);
    const billing = new BillingService(db, stripe as never);

    const pending = await billing.handleStripeEvent(
      stripeEvent('checkout.session.completed', { payment_status: 'unpaid' }),
    );
    expect(pending.handled).toBe(false);

    const confirmed = await billing.handleStripeEvent(
      stripeEvent('checkout.session.async_payment_succeeded', { payment_status: 'unpaid' }),
    );
    expect(confirmed.handled).toBe(true);
  });

  it('voids the invoice when the QR expires', async () => {
    const stripe = stripeStub();
    const { db, audit } = await checkout(stripe);

    const result = await new BillingService(db, stripe as never).handleStripeEvent(
      stripeEvent('checkout.session.expired', { payment_status: 'unpaid' }),
    );

    expect(result.handled).toBe(true);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'billing.payment_failed' }),
    );
  });
});
describe('BillingService plan switch', () => {
  const switchPlan = async () => {
    const stripe = {
      ...stripeStub(),
      cancelNow: vi.fn().mockResolvedValue(undefined),
    };
    const all = stubs({ plan: 'pro', subscription: 'sub_old' });
    const billing = new BillingService(all.db, stripe as never);
    await billing.startCheckout(SITE_ID, { plan: 'business', method: 'card' }, 'user-1');
    return { billing, stripe, all };
  };

  const event = {
    id: 'evt_switch',
    type: 'checkout.session.completed',
    data: {
      object: {
        client_reference_id: 'inv-1',
        payment_status: 'paid',
        subscription: 'sub_1',
        customer: 'cus_1',
        metadata: { siteId: SITE_ID, plan: 'business' },
      },
    },
  };

  it('cancels the previous subscription once the new plan is paid', async () => {
    const { billing, stripe } = await switchPlan();

    await billing.handleStripeEvent(event);

    expect(stripe.cancelNow).toHaveBeenCalledWith('sub_old');
  });

  it('voids invoices left pending by abandoned checkouts', async () => {
    const { billing, all } = await switchPlan();

    await billing.handleStripeEvent(event);

    expect(all.updateMany).toHaveBeenCalledWith({
      where: { status: 'pending', id: { not: 'inv-1' } },
      data: { status: 'void' },
    });
  });

  it('keeps the switch when cancelling the old plan fails', async () => {
    const { billing, stripe, all } = await switchPlan();
    stripe.cancelNow.mockRejectedValue(new Error('stripe down'));

    await expect(billing.handleStripeEvent(event)).resolves.toMatchObject({ handled: true });
    expect(all.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'billing.replaced_subscription_cancel_failed' }),
    );
  });
});

describe('BillingService subscription renewals', () => {
  const subscribed = async () => {
    const stripe = {
      ...stripeStub(),
      cancel: vi.fn().mockResolvedValue({
        id: 'sub_1',
        currentPeriodEnd: Date.UTC(2026, 11, 22),
      }),
    };
    const all = stubs({ plan: 'free' });
    const billing = new BillingService(all.db, stripe as never);
    await billing.startCheckout(SITE_ID, { plan: 'pro', method: 'card' }, 'user-1');
    await billing.handleStripeEvent({
      id: 'evt_c1',
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'inv-1',
          payment_status: 'paid',
          subscription: 'sub_1',
          customer: 'cus_1',
          metadata: { siteId: SITE_ID, plan: 'pro' },
        },
      },
    });
    return { billing, stripe, all };
  };

  it('opens a subscription for card payments', async () => {
    const stripe = stripeStub();
    const all = stubs({ plan: 'free' });

    await new BillingService(all.db, stripe as never).startCheckout(
      SITE_ID,
      { plan: 'pro', method: 'card' },
      'user-1',
    );

    expect(stripe.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'subscription', method: 'card' }),
    );
  });

  it('keeps the subscription id once the card payment completes', async () => {
    const { all } = await subscribed();

    expect(all.update).toHaveBeenCalledWith(
      expect.objectContaining({ plan: 'pro', stripeSubscriptionId: 'sub_1' }),
    );
  });

  it('records a renewal invoice and the next renewal date', async () => {
    const { billing, all } = await subscribed();
    const before = all.create.mock.calls.length;

    const result = await billing.handleStripeEvent({
      id: 'evt_i1',
      type: 'invoice.paid',
      data: {
        object: {
          id: 'in_1',
          subscription: 'sub_1',
          billing_reason: 'subscription_cycle',
          amount_paid: 49900,
          period_start: 1_760_000_000,
          period_end: 1_762_592_000,
        },
      },
    });

    expect(result.handled).toBe(true);
    expect(all.create.mock.calls.length).toBe(before + 1);
    expect(all.create.mock.calls[before]?.[0]).toMatchObject({
      plan: 'pro',
      amount: 499,
      status: 'paid',
      provider: 'stripe',
      providerRef: 'in_1',
      method: 'card',
    });

    const settings = all.update.mock.calls
      .map(([data]) => data.settings)
      .filter(Boolean)
      .at(-1) as { billing?: { renewsAt?: string } };
    expect(settings?.billing?.renewsAt).toBe(new Date(1_762_592_000_000).toISOString());
  });

  it('does not charge the first invoice twice', async () => {
    const { billing, all } = await subscribed();
    const before = all.create.mock.calls.length;

    await billing.handleStripeEvent({
      id: 'evt_i2',
      type: 'invoice.paid',
      data: {
        object: {
          id: 'in_first',
          subscription: 'sub_1',
          billing_reason: 'subscription_create',
          amount_paid: 49900,
          period_end: 1_762_592_000,
        },
      },
    });

    expect(all.create.mock.calls.length).toBe(before);
  });

  it('voids a failed renewal instead of upgrading anything', async () => {
    const { billing, all } = await subscribed();
    const before = all.create.mock.calls.length;

    await billing.handleStripeEvent({
      id: 'evt_i3',
      type: 'invoice.payment_failed',
      data: {
        object: { id: 'in_2', subscription: 'sub_1', amount_due: 49900, period_end: 1_762_592_000 },
      },
    });

    expect(all.create.mock.calls[before]?.[0]).toMatchObject({
      status: 'void',
      providerRef: 'in_2',
    });
  });

  it('drops to the free plan when Stripe ends the subscription', async () => {
    const { billing, all } = await subscribed();

    const result = await billing.handleStripeEvent({
      id: 'evt_s1',
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_1' } },
    });

    expect(result.handled).toBe(true);
    expect(all.update).toHaveBeenCalledWith(
      expect.objectContaining({ plan: 'free', stripeSubscriptionId: null }),
    );
  });

  it('stops the renewal but keeps the paid period', async () => {
    const { billing, stripe, all } = await subscribed();

    await billing.cancelSubscription(SITE_ID, 'user-1');

    expect(stripe.cancel).toHaveBeenCalledWith('sub_1');
    const settings = all.update.mock.calls
      .map(([data]) => data.settings)
      .filter(Boolean)
      .at(-1) as { billing?: { cancelAtPeriodEnd?: boolean } };
    expect(settings?.billing?.cancelAtPeriodEnd).toBe(true);
  });

  it('explains that a PromptPay site has nothing to cancel', async () => {
    const all = stubs({ plan: 'pro' });

    await expect(
      new BillingService(all.db, stripeStub() as never).cancelSubscription(SITE_ID, 'user-1'),
    ).rejects.toThrow(/พร้อมเพย์/);
  });
});

describe('BillingService', () => {
  it('summarises the plan, quota and measured usage', async () => {
    const { db } = stubs({ plan: 'pro', pages: 8, mediaBytes: 1024, team: 3 });

    const summary = await new BillingService(db).summary(SITE_ID);

    expect(summary.plan).toBe('pro');
    expect(summary.planLabel).toBe('โปร');
    expect(summary.price).toBe(499);
    expect(summary.usage).toEqual({ pages: 8, mediaBytes: 1024, team: 3 });
    expect(summary.quota.pages).toBeNull();
    expect(summary.plans.find((plan) => plan.current)?.id).toBe('pro');
  });

  it('answers plan names, features and invoices in the requested language', async () => {
    const { db } = stubs({ plan: 'pro' });
    const summary = await new BillingService(db).summary(SITE_ID, 'en');

    expect(summary.planLabel).toBe('Pro');
    expect(summary.plans.find((plan) => plan.current)?.label).toBe('Pro');
    expect(summary.plans.find((plan) => plan.id === 'free')?.features).toContain(
      'Free web address',
    );
  });

  it('refuses to unlock a paid plan without payment', async () => {
    const { db, update, create } = stubs({ plan: 'free' });

    await expect(
      new BillingService(db).changePlan(SITE_ID, 'starter', 'user-1'),
    ).rejects.toThrow(/ต้องชำระเงินก่อน/);
    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('charges nothing for the free plan', async () => {
    const { db, create } = stubs({ plan: 'starter' });

    await new BillingService(db).changePlan(SITE_ID, 'free', 'user-1');

    expect(create).not.toHaveBeenCalled();
  });

  it('refuses the same plan', async () => {
    const { db } = stubs({ plan: 'pro' });

    await expect(
      new BillingService(db).changePlan(SITE_ID, 'pro', 'user-1'),
    ).rejects.toBeInstanceOf(ApiException);
  });

  it('asks the owner to contact sales for the agency plan', async () => {
    const { db, create } = stubs({ plan: 'free' });

    await expect(
      new BillingService(db).changePlan(SITE_ID, 'agency', 'user-1'),
    ).rejects.toBeInstanceOf(ApiException);
    expect(create).not.toHaveBeenCalled();
  });
});

describe('BillingService proration', () => {
  const period = (): { start: Date; end: Date } => {
    const start = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const end = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
    return { start, end };
  };

  it('takes the unused time on the current plan off the new price', async () => {
    const paidPeriod = period();
    const { db, create } = stubs({ plan: 'pro', paidPeriod });
    const stripe = stripeStub();

    const session = await new BillingService(db, stripe as never).startCheckout(
      SITE_ID,
      { plan: 'business', method: 'card' },
      'user-1',
    );

    const expectedCredit = prorationCreditFor({
      price: 499,
      periodStart: paidPeriod.start,
      periodEnd: paidPeriod.end,
    });
    expect(expectedCredit).toBeGreaterThan(0);
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      plan: 'business',
      credit: expectedCredit,
      amount: 1290 - expectedCredit,
    });
    expect(stripe.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1290, credit: expectedCredit }),
    );
    expect(session.paid).toBe(false);
  });

  it('switches without a payment page when the credit covers the new plan', async () => {
    const { db, create, audit } = stubs({
      plan: 'business',
      paidPeriod: period(),
    });
    const stripe = stripeStub();

    const session = await new BillingService(db, stripe as never).startCheckout(
      SITE_ID,
      { plan: 'starter', method: 'promptpay' },
      'user-1',
    );

    expect(session).toMatchObject({ paid: true, url: '#', method: 'promptpay' });
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      plan: 'starter',
      amount: 0,
      status: 'paid',
      provider: 'proration',
    });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'billing.proration_switch' }),
    );
    expect(stripe.createCheckout).not.toHaveBeenCalled();
  });

  it('shows the credit on each plan in the summary', async () => {
    const { db } = stubs({ plan: 'pro', paidPeriod: period() });

    const summary = await new BillingService(db, stripeStub() as never).summary(SITE_ID);
    const business = summary.plans.find((plan) => plan.id === 'business');
    const current = summary.plans.find((plan) => plan.id === 'pro');

    expect(business?.credit).toBeGreaterThan(0);
    expect(business?.payable).toBe(1290 - (business?.credit ?? 0));
    expect(current?.credit).toBe(0);
    expect(current?.payable).toBe(499);
  });
});

describe('BillingService Stripe shop orders', () => {
  it('marks a shop order paid from the session metadata', async () => {
    const { db } = stubs({ plan: 'free' });
    const commerce = { markOrderPaidByNumber: vi.fn().mockResolvedValue(true) };

    const result = await new BillingService(
      db,
      stripeStub() as never,
      commerce as never,
    ).handleStripeEvent(
      stripeEvent('checkout.session.completed', {
        client_reference_id: 'LM-261022-AB12',
        metadata: { siteId: SITE_ID, orderNumber: 'LM-261022-AB12' },
      }),
    );

    expect(result).toEqual({ handled: true, invoiceId: null });
    expect(commerce.markOrderPaidByNumber).toHaveBeenCalledWith(
      SITE_ID,
      'LM-261022-AB12',
      'cs_test_1',
    );
  });

  it('leaves the order pending until Stripe confirms the money', async () => {
    const { db } = stubs({ plan: 'free' });
    const commerce = { markOrderPaidByNumber: vi.fn().mockResolvedValue(true) };

    const result = await new BillingService(
      db,
      stripeStub() as never,
      commerce as never,
    ).handleStripeEvent(
      stripeEvent('checkout.session.completed', {
        payment_status: 'unpaid',
        metadata: { siteId: SITE_ID, orderNumber: 'LM-261022-AB12' },
      }),
    );

    expect(result.handled).toBe(false);
    expect(commerce.markOrderPaidByNumber).not.toHaveBeenCalled();
  });
});

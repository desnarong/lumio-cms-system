import { describe, expect, it } from 'vitest';
import { buildReaderCheckoutBody, readReaderSubscriptionEvent, readerStatusFromStripe } from './stripe-membership';

const request = {
  siteId: '00000000-0000-4000-8000-0000000000c1',
  readerId: '00000000-0000-4000-8000-0000000000d1',
  planId: '00000000-0000-4000-8000-0000000000e1',
  planName: 'สมาชิกตอบแทน',
  interval: 'month' as const,
  price: 19900,
  currency: 'THB',
  siteUrl: 'https://baandoi.example.com/',
  email: 'reader@example.com',
};

const event = (type: string, object: Record<string, unknown>) => ({
  id: 'evt_1',
  type,
  data: { object },
});

describe('reader checkout body', () => {
  const body = buildReaderCheckoutBody(request);

  it('creates a monthly subscription with the plan metadata on it', () => {
    expect(body.get('mode')).toBe('subscription');
    expect(body.get('line_items[0][price_data][recurring][interval]')).toBe('month');
    expect(body.get('line_items[0][price_data][unit_amount]')).toBe('19900');
    expect(body.get('metadata[siteId]')).toBe(request.siteId);
    expect(body.get('subscription_data[metadata][readerId]')).toBe(request.readerId);
  });

  it('returns the reader to the membership screen of the right site', () => {
    expect(body.get('success_url')).toBe('https://baandoi.example.com/membership?checkout=success');
    expect(body.get('cancel_url')).toBe('https://baandoi.example.com/membership?checkout=cancel');
  });
});

describe('stripe status mapping', () => {
  it('treats a trial as paid access and unpaid as past due', () => {
    expect(readerStatusFromStripe('trialing')).toBe('active');
    expect(readerStatusFromStripe('unpaid')).toBe('past_due');
    expect(readerStatusFromStripe('canceled')).toBe('cancelled');
    expect(readerStatusFromStripe('incomplete_expired')).toBe('expired');
    expect(readerStatusFromStripe('nonsense')).toBeNull();
  });
});

describe('reading a stripe event', () => {
  it('reads the checkout event so a new row can be created', () => {
    const patch = readReaderSubscriptionEvent(
      event('checkout.session.completed', {
        mode: 'subscription',
        subscription: 'sub_123',
        customer: 'cus_123',
        metadata: { siteId: request.siteId, readerId: request.readerId, planId: request.planId },
      }),
    );

    expect(patch).toMatchObject({
      stripeSubscriptionId: 'sub_123',
      stripeCustomerId: 'cus_123',
      status: 'active',
      siteId: request.siteId,
      readerId: request.readerId,
      planId: request.planId,
    });
  });

  it('ignores a one-off payment checkout', () => {
    expect(
      readReaderSubscriptionEvent(
        event('checkout.session.completed', { mode: 'payment', metadata: {} }),
      ),
    ).toBeNull();
  });

  it('reads the paid period of an updated subscription', () => {
    const patch = readReaderSubscriptionEvent(
      event('customer.subscription.updated', {
        id: 'sub_123',
        status: 'active',
        current_period_end: 1_800_000_000,
        cancel_at_period_end: true,
        metadata: { siteId: request.siteId },
      }),
    );

    expect(patch?.currentPeriodEnd?.toISOString()).toBe('2027-01-15T08:00:00.000Z');
    expect(patch?.cancelAtPeriodEnd).toBe(true);
    expect(patch?.status).toBe('active');
  });

  it('closes the membership when Stripe deletes the subscription', () => {
    const patch = readReaderSubscriptionEvent(
      event('customer.subscription.deleted', {
        id: 'sub_123',
        status: 'canceled',
        metadata: { siteId: request.siteId },
      }),
    );
    expect(patch?.status).toBe('cancelled');
    expect(patch?.cancelAtPeriodEnd).toBe(true);
  });

  it('keeps access on a paid invoice and flags a failed one as past due', () => {
    const paid = readReaderSubscriptionEvent(
      event('invoice.paid', {
        subscription: 'sub_123',
        lines: { data: [{ period: { end: 1_800_000_000 } }] },
        metadata: { siteId: request.siteId },
      }),
    );
    expect(paid?.status).toBe('active');
    expect(paid?.currentPeriodEnd?.toISOString()).toBe('2027-01-15T08:00:00.000Z');

    const failed = readReaderSubscriptionEvent(
      event('invoice.payment_failed', {
        subscription: 'sub_123',
        metadata: { siteId: request.siteId },
      }),
    );
    expect(failed?.status).toBe('past_due');
  });

  it('stays quiet about events it does not handle', () => {
    expect(readReaderSubscriptionEvent(event('customer.created', { id: 'cus_1' }))).toBeNull();
  });
});

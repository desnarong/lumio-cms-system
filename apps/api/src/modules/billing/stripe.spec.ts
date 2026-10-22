import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { ApiException } from '../../common/api-error';
import {
  buildCheckoutBody,
  cancelStripeSubscription,
  cancelStripeSubscriptionNow,
  createStripeCheckout,
  verifyStripeSignature,
  type CheckoutRequest,
} from './stripe';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';

const request = (overrides: Partial<CheckoutRequest> = {}): CheckoutRequest => ({
  plan: 'pro',
  planLabel: 'โปร',
  amount: 499,
  method: 'promptpay',
  mode: 'payment',
  invoiceId: 'inv-1',
  siteId: SITE_ID,
  email: 'owner@example.com',
  ...overrides,
});

const jsonResponse = (body: unknown, ok = true): Response =>
  ({ ok, status: ok ? 200 : 400, json: async () => body }) as unknown as Response;

const sign = (payload: string, secret: string, timestamp: number): string =>
  `t=${timestamp},v1=${createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')}`;

describe('buildCheckoutBody', () => {
  it('asks for PromptPay only, in satang, with the invoice in the metadata', () => {
    const body = buildCheckoutBody(request(), 'http://localhost:49300/settings/billing');

    expect(body.get('mode')).toBe('payment');
    expect(body.get('line_items[0][price_data][unit_amount]')).toBe('49900');
    expect(body.get('line_items[0][price_data][currency]')).toBe('thb');
    expect(body.getAll('payment_method_types[]')).toEqual(['promptpay']);
    expect(body.get('client_reference_id')).toBe('inv-1');
    expect(body.get('metadata[siteId]')).toBe(SITE_ID);
    expect(body.get('metadata[plan]')).toBe('pro');
    expect(body.get('success_url')).toContain('checkout=success');
    expect(body.get('success_url')).toContain('{CHECKOUT_SESSION_ID}');
    expect(body.get('cancel_url')).toContain('checkout=cancel');
    expect(body.get('customer_email')).toBe('owner@example.com');
  });

  it('asks for a monthly subscription when the owner pays by card', () => {
    const body = buildCheckoutBody(
      request({ mode: 'subscription', method: 'card' }),
      'http://localhost:49300/x',
    );

    expect(body.get('mode')).toBe('subscription');
    expect(body.get('line_items[0][price_data][recurring][interval]')).toBe('month');
    expect(body.get('subscription_data[metadata][siteId]')).toBe(SITE_ID);
    expect(body.get('subscription_data[metadata][plan]')).toBe('pro');
  });

  it('asks for cards when the owner picked a card', () => {
    const body = buildCheckoutBody(request({ method: 'card' }), 'http://localhost:49300/x');
    expect(body.getAll('payment_method_types[]')).toEqual(['card']);
  });
});

describe('cancelStripeSubscriptionNow', () => {
  it('deletes the subscription so it cannot renew in parallel', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ id: 'sub_old' }));

    await cancelStripeSubscriptionNow(fetchImpl as unknown as typeof fetch, 'sub_old', 'sk_test_1');

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.stripe.com/v1/subscriptions/sub_old');
    expect(init.method).toBe('DELETE');
  });

  it('treats an already-missing subscription as done', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as unknown as Response);

    await expect(
      cancelStripeSubscriptionNow(fetchImpl as unknown as typeof fetch, 'sub_old', 'sk_test_1'),
    ).resolves.toBeUndefined();
  });
});

describe('cancelStripeSubscription', () => {
  it('asks Stripe to stop the next charge and reports the paid period end', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ id: 'sub_1', current_period_end: 1_762_592_000 }),
    );

    const canceled = await cancelStripeSubscription(
      fetchImpl as unknown as typeof fetch,
      'sub_1',
      'sk_test_1',
    );

    expect(canceled).toEqual({ id: 'sub_1', currentPeriodEnd: 1_762_592_000_000 });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.stripe.com/v1/subscriptions/sub_1');
    expect(String(init.body)).toContain('cancel_at_period_end=true');
  });

  it('refuses without a key and when Stripe says no', async () => {
    await expect(
      cancelStripeSubscription(vi.fn() as unknown as typeof fetch, 'sub_1', ''),
    ).rejects.toThrow(/STRIPE_SECRET_KEY/);

    const failing = vi.fn().mockResolvedValue(jsonResponse({ error: 'no' }, false));
    await expect(
      cancelStripeSubscription(failing as unknown as typeof fetch, 'sub_1', 'sk_test_1'),
    ).rejects.toThrow(/ยกเลิกการต่ออายุไม่สำเร็จ/);
  });
});

describe('createStripeCheckout', () => {
  it('posts a form-encoded session request and answers with the hosted URL', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' }),
    );

    const session = await createStripeCheckout(fetchImpl as unknown as typeof fetch, request(), {
      key: 'sk_test_1',
      returnUrl: 'http://localhost:49300/settings/billing',
    });

    expect(session).toEqual({
      id: 'cs_test_1',
      url: 'https://checkout.stripe.com/c/pay/cs_test_1',
    });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.stripe.com/v1/checkout/sessions');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer sk_test_1');
    expect((init.headers as Record<string, string>)['content-type']).toBe(
      'application/x-www-form-urlencoded',
    );
  });

  it('explains that Stripe is not configured', async () => {
    await expect(
      createStripeCheckout(vi.fn() as unknown as typeof fetch, request(), {
        key: '',
        returnUrl: 'http://localhost:49300/x',
      }),
    ).rejects.toThrow(/STRIPE_SECRET_KEY/);
  });

  it('turns a Stripe failure into Thai copy instead of leaking the response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: 'nope' }, false));

    await expect(
      createStripeCheckout(fetchImpl as unknown as typeof fetch, request(), {
        key: 'sk_test_1',
        returnUrl: 'http://localhost:49300/x',
      }),
    ).rejects.toThrow(/Stripe สร้างหน้าชำระเงินไม่สำเร็จ/);
  });

  it('turns a network error into Thai copy too', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      createStripeCheckout(fetchImpl as unknown as typeof fetch, request(), {
        key: 'sk_test_1',
        returnUrl: 'http://localhost:49300/x',
      }),
    ).rejects.toThrow(/ติดต่อ Stripe ไม่ได้/);
  });
});

describe('verifyStripeSignature', () => {
  const secret = 'whsec_test';
  const payload = JSON.stringify({
    id: 'evt_1',
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_1', payment_status: 'paid' } },
  });
  const now = 1_760_000_000;

  it('accepts a payload signed with the webhook secret', () => {
    const event = verifyStripeSignature(
      payload,
      sign(payload, secret, now),
      secret,
      now * 1000 + 1_000,
    );

    expect(event.type).toBe('checkout.session.completed');
    expect(event.data.object).toMatchObject({ id: 'cs_test_1' });
  });

  it('refuses a tampered payload', () => {
    const header = sign(payload, secret, now);
    const tampered = payload.replace('paid', 'unpaid');

    expect(() =>
      verifyStripeSignature(tampered, header, secret, now * 1000),
    ).toThrow(ApiException);
  });

  it('refuses a stale signature so a replay cannot be reused', () => {
    const header = sign(payload, secret, now);

    expect(() =>
      verifyStripeSignature(payload, header, secret, (now + 3_600) * 1000),
    ).toThrow(/หมดอายุ/);
  });

  it('refuses a missing header and a missing secret', () => {
    expect(() => verifyStripeSignature(payload, undefined, secret, now * 1000)).toThrow(
      ApiException,
    );
    expect(() => verifyStripeSignature(payload, sign(payload, secret, now), '', now * 1000)).toThrow(
      /STRIPE_WEBHOOK_SECRET/,
    );
  });

  it('refuses a body that is not the event shape', () => {
    const broken = JSON.stringify({ hello: 'world' });
    expect(() =>
      verifyStripeSignature(broken, sign(broken, secret, now), secret, now * 1000),
    ).toThrow(/webhook/);
  });
});

describe('proration through a one-time coupon', () => {
  it('puts the credit on the first subscription invoice only', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: 'coupon_credit_1' }))
      .mockResolvedValueOnce(
        jsonResponse({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' }),
      );

    await createStripeCheckout(
      fetchImpl as unknown as typeof fetch,
      request({ method: 'card', mode: 'subscription', amount: 1290, credit: 332 }),
      { key: 'sk_test_1', returnUrl: 'http://localhost:49300/x' },
    );

    const [couponUrl, couponInit] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(couponUrl).toBe('https://api.stripe.com/v1/coupons');
    const couponBody = String(couponInit.body);
    expect(couponBody).toContain('amount_off=33200');
    expect(couponBody).toContain('duration=once');
    expect(couponBody).toContain('currency=thb');

    const [sessionUrl, sessionInit] = fetchImpl.mock.calls[1] as [string, RequestInit];
    expect(sessionUrl).toBe('https://api.stripe.com/v1/checkout/sessions');
    const sessionBody = String(sessionInit.body);
    expect(sessionBody).toContain('discounts%5B0%5D%5Bcoupon%5D=coupon_credit_1');
    // The plan price stays whole, so renewals are not discounted.
    expect(sessionBody).toContain('129000');
  });

  it('never discounts a one-off PromptPay charge twice', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' }),
      );

    await createStripeCheckout(
      fetchImpl as unknown as typeof fetch,
      request({ method: 'promptpay', mode: 'payment', amount: 958, credit: 332 }),
      { key: 'sk_test_1', returnUrl: 'http://localhost:49300/x' },
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(fetchImpl.mock.calls[0]?.[1]?.body)).toContain('95800');
  });

  it('explains a coupon failure instead of opening a wrong checkout', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: 'nope' }, false));

    await expect(
      createStripeCheckout(
        fetchImpl as unknown as typeof fetch,
        request({ method: 'card', mode: 'subscription', amount: 1290, credit: 100 }),
        { key: 'sk_test_1', returnUrl: 'http://localhost:49300/x' },
      ),
    ).rejects.toThrow(/ส่วนลด/);
  });
});

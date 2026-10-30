import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createStripeCheckout, createStripeCoupon } from './stripe';
import { createStripeOrderSession } from '../commerce/stripe-order';
import { refundStripePayment } from '../commerce/stripe-refund';
import { createReaderCheckoutSession } from '../membership/stripe-membership';

/**
 * Payments against the real Stripe test account (docs/PROGRESS.md batch 62).
 *
 * Every other Stripe spec stubs `fetch`; this one proves the payloads we send
 * are accepted by Stripe itself. It needs a **test** secret key and is skipped
 * without one, so CI and a Community install stay offline. A live key is never
 * accepted here: the guard below refuses anything that does not start with
 * `sk_test_`, so this suite can never charge a real card.
 *
 *   STRIPE_SECRET_KEY=sk_test_... pnpm --filter api test src/modules/billing/stripe.integration.spec.ts
 *
 * Keys are read from the shell first, then from a local `.env` (root or
 * `apps/api`), which is gitignored.
 */

const readEnvFile = (name: string): string => {
  const candidates = [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')];
  for (const path of candidates) {
    try {
      const line = readFileSync(path, 'utf8')
        .split(/\r?\n/)
        .find((entry) => entry.startsWith(`${name}=`));
      if (line)
        return line
          .slice(name.length + 1)
          .trim()
          .replace(/^['"]|['"]$/g, '');
    } catch {
      // A missing .env is normal in CI; fall through to the next candidate.
    }
  }
  return '';
};

const configuredKey = (
  process.env.STRIPE_SECRET_KEY ||
  process.env.STRIPE_TEST_SECRET_KEY ||
  readEnvFile('STRIPE_SECRET_KEY')
).trim();

/** Test keys only: a live key would move real money. */
const TEST_KEY = configuredKey.startsWith('sk_test_') ? configuredKey : '';

interface StripeObject {
  id: string;
  [key: string]: unknown;
}

const callStripe = async (
  path: string,
  init: RequestInit = {},
): Promise<StripeObject & Record<string, unknown>> => {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${TEST_KEY}`,
      'content-type': 'application/x-www-form-urlencoded',
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(20_000),
  });
  const payload = (await response.json().catch(() => null)) as
    (Record<string, unknown> & { error?: { message?: string } }) | null;
  if (!response.ok || !payload) {
    throw new Error(
      `Stripe ${path} → ${response.status}: ${payload?.error?.message ?? 'no response body'}`,
    );
  }
  return payload as StripeObject & Record<string, unknown>;
};

const post = (
  path: string,
  body: URLSearchParams,
): Promise<StripeObject & Record<string, unknown>> => callStripe(path, { method: 'POST', body });
const get = (path: string): Promise<StripeObject & Record<string, unknown>> =>
  callStripe(path, { method: 'GET' });
const remove = (path: string): Promise<StripeObject & Record<string, unknown>> =>
  callStripe(path, { method: 'DELETE' });

/** Test-mode sessions are thrown away so the dashboard stays readable. */
const expireSession = async (sessionId: string): Promise<void> => {
  await post(`/checkout/sessions/${sessionId}/expire`, new URLSearchParams());
};

describe.skipIf(TEST_KEY.length === 0)('Stripe test account', () => {
  it('creates a card payment session for a paid plan and expires it', async () => {
    const session = await createStripeCheckout(
      fetch,
      {
        plan: 'pro',
        planLabel: 'Pro',
        amount: 590,
        method: 'card',
        mode: 'payment',
        invoiceId: 'inv_integration_test',
        siteId: 'site-integration-test',
        email: 'buyer@example.com',
      },
      { key: TEST_KEY, returnUrl: 'https://example.com/settings/billing' },
    );

    expect(session.id.startsWith('cs_test_')).toBe(true);
    expect(session.url.startsWith('https://checkout.stripe.com/')).toBe(true);

    const stored = await get(`/checkout/sessions/${session.id}`);
    expect(stored).toMatchObject({
      amount_total: 59_000,
      currency: 'thb',
      mode: 'payment',
      client_reference_id: 'inv_integration_test',
    });
    expect(stored.metadata).toMatchObject({
      siteId: 'site-integration-test',
      plan: 'pro',
      invoiceId: 'inv_integration_test',
    });
    expect(stored.payment_method_types).toContain('card');

    await expireSession(session.id);
    const expired = await get(`/checkout/sessions/${session.id}`);
    expect(expired.status).toBe('expired');
  });

  it('issues a one-time coupon for the unused part of a plan', async () => {
    const couponId = await createStripeCoupon(fetch, 120.5, TEST_KEY, 'Pro');

    try {
      const coupon = await get(`/coupons/${couponId}`);
      expect(coupon).toMatchObject({
        amount_off: 12_050,
        currency: 'thb',
        duration: 'once',
      });
    } finally {
      await remove(`/coupons/${couponId}`);
    }
  });

  it('creates a subscription session that only offers cards', async () => {
    const session = await createStripeCheckout(
      fetch,
      {
        plan: 'pro',
        planLabel: 'Pro',
        amount: 990,
        credit: 100,
        method: 'card',
        mode: 'subscription',
        invoiceId: 'inv_integration_subscription',
        siteId: 'site-integration-test',
        email: null,
      },
      { key: TEST_KEY, returnUrl: 'https://example.com/settings/billing' },
    );

    const stored = await get(`/checkout/sessions/${session.id}`);
    expect(stored).toMatchObject({
      mode: 'subscription',
      client_reference_id: 'inv_integration_subscription',
    });
    expect(stored.payment_method_types).toContain('card');
    expect(stored.metadata).toMatchObject({
      siteId: 'site-integration-test',
      plan: 'pro',
      invoiceId: 'inv_integration_subscription',
    });

    await expireSession(session.id);
  });

  it('creates a shop order session that adds the shipping fee', async () => {
    const session = await createStripeOrderSession(
      fetch,
      {
        siteId: 'site-integration-test',
        orderNumber: 'LM-INTEGRATION-1',
        orderToken: 'token-integration-1',
        customerEmail: 'buyer@example.com',
        items: [
          { title: 'หลอดไฟ LED 9W', price: 15_000, quantity: 2 },
          { title: 'โคมไฟตั้งโต๊ะ', price: 45_000, quantity: 1 },
        ],
        shippingFee: 5_000,
        publicUrl: 'https://shop.example.com',
      },
      TEST_KEY,
    );

    const stored = await get(`/checkout/sessions/${session.id}`);
    expect(stored.amount_total).toBe(80_000);
    expect(stored.success_url).toBe('https://shop.example.com/order/token-integration-1?paid=1');
    expect(stored.metadata).toMatchObject({
      siteId: 'site-integration-test',
      orderNumber: 'LM-INTEGRATION-1',
    });

    await expireSession(session.id);
  });

  it('creates a reader membership session that renews every month', async () => {
    const session = await createReaderCheckoutSession(
      fetch,
      {
        siteId: 'site-integration-test',
        readerId: 'reader-integration-test',
        planId: 'plan-integration-test',
        planName: 'สมาชิกอ่านทุกบทความ',
        interval: 'month',
        price: 19_900,
        currency: 'THB',
        siteUrl: 'https://shop.example.com',
        email: 'reader@example.com',
      },
      TEST_KEY,
    );

    const stored = await get(`/checkout/sessions/${session.id}`);
    expect(stored).toMatchObject({
      mode: 'subscription',
      client_reference_id: 'reader-integration-test',
    });
    expect(stored.metadata).toMatchObject({
      siteId: 'site-integration-test',
      readerId: 'reader-integration-test',
      planId: 'plan-integration-test',
    });
    expect(stored.payment_method_types).toContain('card');

    await expireSession(session.id);
  });

  it('charges the test card and refunds it through the shop refund path', async () => {
    const intent = await post(
      '/payment_intents',
      new URLSearchParams({
        amount: '10000',
        currency: 'thb',
        payment_method: 'pm_card_visa',
        confirm: 'true',
        'automatic_payment_methods[enabled]': 'true',
        'automatic_payment_methods[allow_redirects]': 'never',
        description: 'Lumio integration test',
      }),
    );

    expect(intent.id.startsWith('pi_')).toBe(true);
    expect(intent.status).toBe('succeeded');
    expect(intent.amount_received).toBe(10_000);

    const refundId = await refundStripePayment(
      fetch,
      { paymentIntent: intent.id, amount: 10_000, orderNumber: 'LM-INTEGRATION-REFUND' },
      TEST_KEY,
    );
    expect(refundId.startsWith('re_')).toBe(true);

    const refund = await get(`/refunds/${refundId}`);
    expect(refund.payment_intent).toBe(intent.id);
    expect(refund.amount).toBe(10_000);
    expect(['succeeded', 'pending']).toContain(refund.status);
  });

  it('refuses a key that is not a Stripe test key', () => {
    // The suite itself is skipped without a test key; this documents the guard.
    expect(TEST_KEY === '' || TEST_KEY.startsWith('sk_test_')).toBe(true);
  });
});

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PaymentMethod } from '@lumio/shared';
import { ApiException } from '../../common/api-error';

/**
 * Stripe Checkout (docs/design/18-deployment.md 18.7). Both payment rails the
 * owner can pick run through one hosted page:
 *
 * - `card`: Visa/Mastercard/JCB, confirmed immediately.
 * - `promptpay`: a Thai QR code; Stripe confirms it asynchronously and sends
 *   `checkout.session.async_payment_succeeded` when the money arrives.
 *
 * The integration is plain REST (form-encoded) plus webhook signature checking,
 * so it needs no SDK and every path is testable with a stub `fetch`.
 */

export const stripeSecretKey = (): string => process.env.STRIPE_SECRET_KEY ?? '';

export const stripeWebhookSecret = (): string => process.env.STRIPE_WEBHOOK_SECRET ?? '';

/** The admin screen to return to after paying or cancelling. */
export const billingReturnUrl = (): string =>
  process.env.BILLING_RETURN_URL ?? 'http://localhost:49300/settings/billing';

export const stripeConfigured = (): boolean => stripeSecretKey().length > 0;

export interface CheckoutRequest {
  /** Plan id, stored on the invoice and in the session metadata. */
  plan: string;
  /** Business name shown on the Stripe page. */
  planLabel: string;
  /** Price in baht; Stripe wants the smallest unit (satang). */
  amount: number;
  /**
   * Unused time on the old plan, in baht. For a subscription this becomes a
   * one-time coupon so only the first invoice is cheaper and renewals stay at
   * the plan price; the caller already takes it off `amount` for one-off rails.
   */
  credit?: number;
  method: PaymentMethod;
  /** Cards renew automatically; PromptPay is a one-time payment. */
  mode: 'payment' | 'subscription';
  invoiceId: string;
  siteId: string;
  email: string | null;
}

export interface StripeSession {
  id: string;
  url: string;
}

const STRIPE_API = 'https://api.stripe.com/v1/checkout/sessions';
const STRIPE_COUPONS = 'https://api.stripe.com/v1/coupons';

/** Creates the one-time coupon that carries the proration credit. */
export const createStripeCoupon = async (
  fetchImpl: typeof fetch,
  creditBaht: number,
  key: string,
  planLabel = '',
): Promise<string> => {
  const body = new URLSearchParams();
  body.set('amount_off', String(Math.round(creditBaht * 100)));
  body.set('currency', 'thb');
  // Once: the next renewal charges the full plan price again.
  body.set('duration', 'once');
  body.set('name', `Lumio credit${planLabel ? ` · ${planLabel}` : ''}`);

  let response: Response;
  try {
    response = await fetchImpl(STRIPE_COUPONS, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw ApiException.conflict('ติดต่อ Stripe ไม่ได้ ลองอีกครั้ง');
  }

  const payload = (await response.json().catch(() => null)) as { id?: unknown } | null;
  if (!response.ok || typeof payload?.id !== 'string') {
    throw ApiException.conflict('Stripe สร้างส่วนลดไม่สำเร็จ ลองอีกครั้ง');
  }
  return payload.id;
};

export const buildCheckoutBody = (
  request: CheckoutRequest,
  returnUrl: string,
  couponId: string | null = null,
): URLSearchParams => {
  const body = new URLSearchParams();
  // Stripe replaces this literal placeholder, so it must not be percent-encoded.
  const separator = returnUrl.includes('?') ? '&' : '?';
  const success = `${returnUrl}${separator}checkout=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancel = `${returnUrl}${separator}checkout=cancel`;

  body.set('mode', request.mode);
  body.set('success_url', success);
  body.set('cancel_url', cancel);
  body.set('client_reference_id', request.invoiceId);
  body.set('metadata[siteId]', request.siteId);
  body.set('metadata[plan]', request.plan);
  body.set('metadata[invoiceId]', request.invoiceId);
  body.set('line_items[0][quantity]', '1');
  body.set('line_items[0][price_data][currency]', 'thb');
  body.set('line_items[0][price_data][unit_amount]', String(Math.round(request.amount * 100)));
  if (request.mode === 'subscription') {
    body.set('line_items[0][price_data][recurring][interval]', 'month');
    body.set('subscription_data[metadata][siteId]', request.siteId);
    body.set('subscription_data[metadata][plan]', request.plan);
  }
  if (couponId) body.set('discounts[0][coupon]', couponId);
  body.set('line_items[0][price_data][product_data][name]', `Lumio ${request.planLabel} · 1 เดือน`);
  // Only the chosen rail is offered, so the page cannot be paid another way.
  body.append('payment_method_types[]', request.method);
  if (request.email) body.set('customer_email', request.email);
  return body;
};

export const createStripeCheckout = async (
  fetchImpl: typeof fetch,
  request: CheckoutRequest,
  config: { key: string; returnUrl: string } = {
    key: stripeSecretKey(),
    returnUrl: billingReturnUrl(),
  },
): Promise<StripeSession> => {
  if (config.key.length === 0) {
    throw ApiException.conflict(
      'ยังไม่ได้เชื่อมต่อ Stripe กรุณาตั้งค่า STRIPE_SECRET_KEY ก่อนรับชำระเงิน',
    );
  }

  let response: Response;
  // A subscription renews at the plan price, so the credit rides on a one-time
  // coupon instead of lowering `unit_amount` forever.
  const couponId =
    request.mode === 'subscription' && (request.credit ?? 0) > 0
      ? await createStripeCoupon(fetchImpl, request.credit ?? 0, config.key, request.planLabel)
      : null;

  try {
    response = await fetchImpl(STRIPE_API, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.key}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: buildCheckoutBody(request, config.returnUrl, couponId),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw ApiException.conflict('ติดต่อ Stripe ไม่ได้ ลองอีกครั้ง');
  }

  if (!response.ok) {
    throw ApiException.conflict('Stripe สร้างหน้าชำระเงินไม่สำเร็จ ลองอีกครั้ง');
  }

  const payload = (await response.json().catch(() => null)) as {
    id?: unknown;
    url?: unknown;
  } | null;
  if (typeof payload?.id !== 'string' || typeof payload?.url !== 'string') {
    throw ApiException.conflict('Stripe ตอบกลับไม่ครบ ลองอีกครั้ง');
  }

  return { id: payload.id, url: payload.url };
};

export interface CanceledSubscription {
  id: string;
  /** End of the period already paid for, in ms; null when Stripe omits it. */
  currentPeriodEnd: number | null;
}

/**
 * Stops the next renewal but keeps the plan the owner already paid for
 * (docs/design/18-deployment.md 18.7). Stripe cancels on the period end.
 */
export const cancelStripeSubscription = async (
  fetchImpl: typeof fetch,
  subscriptionId: string,
  key: string = stripeSecretKey(),
): Promise<CanceledSubscription> => {
  if (key.length === 0) {
    throw ApiException.conflict(
      'ยังไม่ได้เชื่อมต่อ Stripe กรุณาตั้งค่า STRIPE_SECRET_KEY ก่อนจัดการการต่ออายุ',
    );
  }

  let response: Response;
  try {
    response = await fetchImpl(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ cancel_at_period_end: 'true' }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw ApiException.conflict('ติดต่อ Stripe ไม่ได้ ลองอีกครั้ง');
  }
  if (!response.ok) {
    throw ApiException.conflict('ยกเลิกการต่ออายุไม่สำเร็จ ลองอีกครั้ง');
  }

  const payload = (await response.json().catch(() => null)) as {
    id?: unknown;
    current_period_end?: unknown;
  } | null;
  if (typeof payload?.id !== 'string') {
    throw ApiException.conflict('Stripe ตอบกลับไม่ครบ ลองอีกครั้ง');
  }

  return {
    id: payload.id,
    currentPeriodEnd:
      typeof payload.current_period_end === 'number' ? payload.current_period_end * 1000 : null,
  };
};

/**
 * Cancels a subscription immediately (not at period end). Used when the owner
 * switches to another plan: the new subscription takes over right away, so the
 * old one must not renew too (docs/design/18-deployment.md 18.7).
 */
export const cancelStripeSubscriptionNow = async (
  fetchImpl: typeof fetch,
  subscriptionId: string,
  key: string = stripeSecretKey(),
): Promise<void> => {
  if (key.length === 0) {
    throw ApiException.conflict('ยังไม่ได้เชื่อมต่อ Stripe กรุณาตั้งค่า STRIPE_SECRET_KEY');
  }

  let response: Response;
  try {
    response = await fetchImpl(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw ApiException.conflict('ติดต่อ Stripe ไม่ได้ ลองอีกครั้ง');
  }
  if (!response.ok && response.status !== 404) {
    throw ApiException.conflict('ยกเลิกแพ็กเกจเดิมไม่สำเร็จ กรุณาติดต่อฝ่ายสนับสนุน');
  }
};

export interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

/** Stripe allows five minutes of clock drift on webhook signatures. */
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

/**
 * Verifies the `Stripe-Signature` header over the exact request bytes. Any
 * mismatch, stale timestamp or missing secret is refused before the payload is
 * parsed, so a forged webhook can never mark an invoice paid.
 */
export const verifyStripeSignature = (
  payload: string | Buffer,
  header: string | undefined,
  secret: string,
  nowMs: number = Date.now(),
): StripeEvent => {
  if (secret.length === 0) {
    throw ApiException.conflict(
      'ยังไม่ได้ตั้งค่า STRIPE_WEBHOOK_SECRET จึงตรวจสอบการชำระเงินไม่ได้',
    );
  }
  if (!header) throw ApiException.unauthorized('คำขอไม่ผ่านการตรวจสอบจาก Stripe');

  let timestamp = Number.NaN;
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const [key, value] = part.trim().split('=', 2);
    if (key === 't' && value) timestamp = Number(value);
    if (key === 'v1' && value) signatures.push(value);
  }

  if (!Number.isFinite(timestamp) || signatures.length === 0) {
    throw ApiException.unauthorized('ลายเซ็นจาก Stripe ไม่ครบถ้วน');
  }
  if (Math.abs(nowMs / 1000 - timestamp) > SIGNATURE_TOLERANCE_SECONDS) {
    throw ApiException.unauthorized('ลายเซ็นจาก Stripe หมดอายุ');
  }

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${payload.toString()}`)
    .digest('hex');
  const matched = signatures.some((signature) => {
    const provided = Buffer.from(signature);
    const wanted = Buffer.from(expected);
    return provided.length === wanted.length && timingSafeEqual(provided, wanted);
  });
  if (!matched) throw ApiException.unauthorized('ลายเซ็นจาก Stripe ไม่ถูกต้อง');

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload.toString());
  } catch {
    throw ApiException.validation('เนื้อหา webhook อ่านไม่ได้');
  }
  const event = parsed as { id?: unknown; type?: unknown; data?: { object?: unknown } } | null;
  if (
    !event ||
    typeof event.id !== 'string' ||
    typeof event.type !== 'string' ||
    event.data === null ||
    typeof event.data !== 'object' ||
    event.data.object === null ||
    typeof event.data.object !== 'object'
  ) {
    throw ApiException.validation('เนื้อหา webhook ไม่ครบถ้วน');
  }

  return {
    id: event.id,
    type: event.type,
    data: { object: event.data.object as Record<string, unknown> },
  };
};

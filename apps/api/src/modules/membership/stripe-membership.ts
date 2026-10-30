import {
  intervalLabel,
  type MembershipInterval,
  type ReaderSubscriptionStatus,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { postCheckoutSession, stripeSecretKey, type StripeEvent } from '../billing/stripe';

/**
 * Reader subscriptions on Stripe (docs/PROGRESS.md batch A). Same plain REST
 * approach as the shop and platform billing: a hosted Checkout page in
 * subscription mode, plus a verified webhook that keeps the local row in step.
 * The plan price is sent as `price_data`, so no Stripe price ids have to be
 * created by hand.
 */

export interface ReaderCheckoutRequest {
  siteId: string;
  readerId: string;
  planId: string;
  planName: string;
  interval: MembershipInterval;
  /** Price in satang. */
  price: number;
  currency: string;
  /** Public origin of the site, so the reader comes back to the join page. */
  siteUrl: string;
  email: string;
}

const siteBase = (siteUrl: string): string => siteUrl.replace(/\/+$/, '');

export const buildReaderCheckoutBody = (request: ReaderCheckoutRequest): URLSearchParams => {
  const base = siteBase(request.siteUrl);
  const body = new URLSearchParams();

  body.set('mode', 'subscription');
  body.set('success_url', `${base}/membership?checkout=success`);
  body.set('cancel_url', `${base}/membership?checkout=cancel`);
  body.set('client_reference_id', request.readerId);
  body.set('customer_email', request.email);
  body.set('locale', 'th');
  body.set('metadata[siteId]', request.siteId);
  body.set('metadata[readerId]', request.readerId);
  body.set('metadata[planId]', request.planId);
  body.set('subscription_data[metadata][siteId]', request.siteId);
  body.set('subscription_data[metadata][readerId]', request.readerId);
  body.set('subscription_data[metadata][planId]', request.planId);

  body.set('line_items[0][quantity]', '1');
  body.set('line_items[0][price_data][currency]', request.currency.toLowerCase());
  body.set('line_items[0][price_data][unit_amount]', String(Math.max(0, request.price)));
  body.set('line_items[0][price_data][recurring][interval]', request.interval);
  body.set(
    'line_items[0][price_data][product_data][name]',
    `${request.planName} · ${intervalLabel(request.interval)}`.slice(0, 200),
  );

  body.append('payment_method_types[]', 'card');
  return body;
};

export interface ReaderCheckoutSession {
  id: string;
  url: string;
}

export const createReaderCheckoutSession = async (
  fetchImpl: typeof fetch,
  request: ReaderCheckoutRequest,
  key: string = stripeSecretKey(),
): Promise<ReaderCheckoutSession> => {
  if (key.length === 0) {
    throw ApiException.conflict(
      'เว็บนี้ยังไม่เปิดรับชำระเงินออนไลน์ กรุณาติดต่อผู้ดูแลเว็บ',
    );
  }

  return postCheckoutSession(fetchImpl, buildReaderCheckoutBody(request), key);
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const unixToDate = (value: unknown): Date | null => {
  const seconds = typeof value === 'number' ? value : Number.NaN;
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1_000) : null;
};

/** Stripe's subscription statuses, mapped onto the four we store. */
export const readerStatusFromStripe = (value: unknown): ReaderSubscriptionStatus | null => {
  switch (value) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
      return 'cancelled';
    case 'incomplete_expired':
      return 'expired';
    default:
      return null;
  }
};

export interface ReaderSubscriptionPatch {
  /** Stripe ids and period, straight from the event. */
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
  status: ReaderSubscriptionStatus | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean | null;
  /** Present on checkout events, so a brand-new row can be created. */
  siteId: string | null;
  readerId: string | null;
  planId: string | null;
}

/**
 * Reads the fields we care about out of a Stripe event. Returns null for event
 * types we do not handle, so the webhook can stay quiet about the rest.
 */
export const readReaderSubscriptionEvent = (event: StripeEvent): ReaderSubscriptionPatch | null => {
  const object = asRecord(event.data.object);
  if (!object) return null;

  const metadata = asRecord(object.metadata) ?? {};

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    if (object.mode !== 'subscription') return null;
    // A completed session whose money has not arrived yet must not unlock pages;
    // the async event arrives once the payment actually settles.
    if (event.type === 'checkout.session.completed' && object.payment_status === 'unpaid') {
      return null;
    }
    return {
      stripeSubscriptionId: text(object.subscription),
      stripeCustomerId: text(object.customer),
      status: 'active',
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      siteId: text(metadata.siteId),
      readerId: text(metadata.readerId),
      planId: text(metadata.planId),
    };
  }

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const deleted = event.type === 'customer.subscription.deleted';
    return {
      stripeSubscriptionId: text(object.id),
      stripeCustomerId: text(object.customer),
      status: deleted ? 'cancelled' : readerStatusFromStripe(object.status),
      currentPeriodEnd: unixToDate(object.current_period_end),
      cancelAtPeriodEnd: deleted ? true : object.cancel_at_period_end === true,
      siteId: text(metadata.siteId),
      readerId: text(metadata.readerId),
      planId: text(metadata.planId),
    };
  }

  if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
    const lines = asRecord(object.lines);
    const rows = Array.isArray(lines?.data) ? (lines.data as unknown[]) : [];
    const periodEnds = rows
      .map((row) => unixToDate(asRecord(asRecord(row)?.period)?.end))
      .filter((date): date is Date => date !== null);
    return {
      stripeSubscriptionId: text(object.subscription),
      stripeCustomerId: text(object.customer),
      status: event.type === 'invoice.paid' ? 'active' : 'past_due',
      currentPeriodEnd: periodEnds.length > 0 ? new Date(Math.max(...periodEnds.map(Number))) : null,
      cancelAtPeriodEnd: null,
      siteId: text(metadata.siteId),
      readerId: text(metadata.readerId),
      planId: text(metadata.planId),
    };
  }

  return null;
};

/**
 * Stops or resumes the next renewal. Stripe keeps the paid period either way, so
 * a reader who cancels keeps reading until the date they already paid for.
 */
export const setStripeCancelAtPeriodEnd = async (
  fetchImpl: typeof fetch,
  subscriptionId: string,
  cancel: boolean,
  key: string = stripeSecretKey(),
): Promise<void> => {
  if (key.length === 0) {
    throw ApiException.conflict('ยังไม่ได้เชื่อมต่อ Stripe กรุณาตั้งค่า STRIPE_SECRET_KEY');
  }

  let response: Response;
  try {
    response = await fetchImpl(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ cancel_at_period_end: cancel ? 'true' : 'false' }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw ApiException.conflict('ติดต่อ Stripe ไม่ได้ ลองอีกครั้ง');
  }

  if (!response.ok) {
    throw ApiException.conflict(
      cancel ? 'หยุดต่ออายุไม่สำเร็จ ลองอีกครั้ง' : 'เปิดต่ออายุอีกครั้งไม่สำเร็จ ลองอีกครั้ง',
    );
  }
};

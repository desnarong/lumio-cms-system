import { ApiException } from '../../common/api-error';
import { stripeSecretKey } from '../billing/stripe';

/**
 * Sends money back through Stripe (docs/design/03-scope.md 3.3). A refund refers
 * to the payment intent that was charged, which the webhook stores on the order
 * as `provider_ref`; without that reference the money never left Stripe's books,
 * so the shop refunds by hand instead.
 */

const STRIPE_REFUNDS = 'https://api.stripe.com/v1/refunds';

export interface StripeRefundRequest {
  paymentIntent: string;
  /** Satang; omitted means the full remaining amount. */
  amount: number;
  orderNumber: string;
}

export const buildStripeRefundBody = (request: StripeRefundRequest): URLSearchParams => {
  const body = new URLSearchParams();
  body.set('payment_intent', request.paymentIntent);
  body.set('amount', String(request.amount));
  body.set('metadata[orderNumber]', request.orderNumber);
  return body;
};

/** True when the stored reference can be refunded through Stripe. */
export const isStripePaymentIntent = (value: string | null): value is string =>
  typeof value === 'string' && value.startsWith('pi_');

export const refundStripePayment = async (
  fetchImpl: typeof fetch,
  request: StripeRefundRequest,
  key: string = stripeSecretKey(),
): Promise<string> => {
  if (key.trim().length === 0) {
    throw ApiException.conflict('ร้านนี้ยังไม่ได้เชื่อมบัตรกับ Stripe จึงคืนเงินผ่านระบบไม่ได้');
  }

  let response: Response;
  try {
    response = await fetchImpl(STRIPE_REFUNDS, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: buildStripeRefundBody(request),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw ApiException.conflict('ติดต่อ Stripe ไม่ได้ กรุณาลองอีกครั้ง');
  }

  const payload = (await response.json().catch(() => null)) as
    | { id?: string; error?: { message?: string } }
    | null;

  if (!response.ok || !payload?.id) {
    const reason = payload?.error?.message ?? `Stripe ตอบ ${response.status}`;
    throw ApiException.conflict(`คืนเงินผ่านบัตรไม่สำเร็จ: ${reason.slice(0, 160)}`);
  }
  return payload.id;
};

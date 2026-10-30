import { ApiException } from '../../common/api-error';
import { postCheckoutSession, stripeConfigured, stripeSecretKey } from '../billing/stripe';

/**
 * Card checkout for a shop order (docs/design/03-scope.md 3.3). The order row is
 * created first, so the webhook can find it by number; the hosted Stripe page is
 * then attached to that row. Plain REST form encoding keeps it testable with a
 * stub `fetch` and avoids carrying an SDK.
 */

export interface StripeOrderItem {
  title: string;
  price: number;
  quantity: number;
}

export interface StripeOrderRequest {
  siteId: string;
  orderNumber: string;
  orderToken: string;
  customerEmail: string | null;
  items: readonly StripeOrderItem[];
  shippingFee: number;
  /** Public origin of the site, so the buyer returns to its order page. */
  publicUrl: string;
}

export interface StripeOrderSession {
  id: string;
  url: string;
}

export const shopCardEnabled = (): boolean => stripeConfigured();

export const buildStripeOrderBody = (request: StripeOrderRequest): URLSearchParams => {
  const body = new URLSearchParams();
  const orderUrl = `${request.publicUrl.replace(/\/+$/, '')}/order/${request.orderToken}`;

  body.set('mode', 'payment');
  body.set('success_url', `${orderUrl}?paid=1`);
  body.set('cancel_url', `${orderUrl}?cancelled=1`);
  body.set('client_reference_id', request.orderNumber);
  body.set('locale', 'th');
  body.set('metadata[siteId]', request.siteId);
  body.set('metadata[orderNumber]', request.orderNumber);
  body.set('metadata[orderToken]', request.orderToken);
  if (request.customerEmail) body.set('customer_email', request.customerEmail);
  body.append('payment_method_types[]', 'card');

  const lines: StripeOrderItem[] = [
    ...request.items,
    ...(request.shippingFee > 0
      ? [{ title: 'ค่าจัดส่ง', price: request.shippingFee, quantity: 1 }]
      : []),
  ];
  lines.forEach((item, index) => {
    body.set(`line_items[${index}][quantity]`, String(item.quantity));
    body.set(`line_items[${index}][price_data][currency]`, 'thb');
    body.set(`line_items[${index}][price_data][unit_amount]`, String(item.price));
    body.set(`line_items[${index}][price_data][product_data][name]`, item.title.slice(0, 200));
  });

  return body;
};

export const createStripeOrderSession = async (
  fetchImpl: typeof fetch,
  request: StripeOrderRequest,
  key: string = stripeSecretKey(),
): Promise<StripeOrderSession> => {
  if (key.length === 0) {
    throw ApiException.conflict(
      'ร้านนี้ยังไม่เปิดรับบัตร กรุณาเลือกพร้อมเพย์หรือเก็บเงินปลายทาง',
    );
  }

  return postCheckoutSession(fetchImpl, buildStripeOrderBody(request), key);
};

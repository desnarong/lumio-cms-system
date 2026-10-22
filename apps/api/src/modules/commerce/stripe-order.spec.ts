import { describe, expect, it, vi } from 'vitest';
import {
  buildStripeOrderBody,
  createStripeOrderSession,
  type StripeOrderRequest,
} from './stripe-order';

const request: StripeOrderRequest = {
  siteId: 'site-1',
  orderNumber: 'LM-261022-AB12',
  orderToken: 'token-1',
  customerEmail: 'buyer@example.com',
  items: [
    { title: 'กาแฟคั่วกลาง', price: 35_000, quantity: 2 },
    { title: 'แก้วเซรามิก', price: 29_000, quantity: 1 },
  ],
  shippingFee: 5_000,
  publicUrl: 'https://baandoi.example.com',
};

describe('buildStripeOrderBody', () => {
  it('sends the order, the shipping line and the return urls', () => {
    const body = buildStripeOrderBody(request);

    expect(body.get('mode')).toBe('payment');
    expect(body.get('success_url')).toBe('https://baandoi.example.com/order/token-1?paid=1');
    expect(body.get('cancel_url')).toBe('https://baandoi.example.com/order/token-1?cancelled=1');
    expect(body.get('metadata[orderNumber]')).toBe('LM-261022-AB12');
    expect(body.get('metadata[siteId]')).toBe('site-1');
    expect(body.get('customer_email')).toBe('buyer@example.com');
    expect(body.get('line_items[0][price_data][unit_amount]')).toBe('35000');
    expect(body.get('line_items[0][quantity]')).toBe('2');
    expect(body.get('line_items[2][price_data][product_data][name]')).toBe('ค่าจัดส่ง');
    expect(body.getAll('payment_method_types[]')).toEqual(['card']);
    expect(body.get('line_items[3][quantity]')).toBeNull();
  });

  it('omits the shipping line when delivery is free', () => {
    const body = buildStripeOrderBody({ ...request, shippingFee: 0 });

    expect(body.get('line_items[2][quantity]')).toBeNull();
  });
});

describe('createStripeOrderSession', () => {
  it('returns the hosted page', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: 'cs_1', url: 'https://checkout.stripe.com/c/cs_1' }), {
          status: 200,
        }),
      );
    const session = await createStripeOrderSession(fetchImpl as unknown as typeof fetch, request, 'sk_test');

    expect(session).toEqual({ id: 'cs_1', url: 'https://checkout.stripe.com/c/cs_1' });
  });

  it('refuses when Stripe is not configured', async () => {
    await expect(
      createStripeOrderSession(vi.fn() as unknown as typeof fetch, request, ''),
    ).rejects.toMatchObject({ code: 'conflict' });
  });

  it('reports a provider failure as a conflict', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('nope', { status: 500 }));
    await expect(
      createStripeOrderSession(fetchImpl as unknown as typeof fetch, request, 'sk_test'),
    ).rejects.toMatchObject({ code: 'conflict' });
  });
});

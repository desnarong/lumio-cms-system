import { describe, expect, it } from 'vitest';
import {
  ORDER_WEBHOOK_TEST_EVENT,
  orderWebhookPayloadSchema,
  orderWebhookViewSchema,
  readOrderWebhookSettings,
  updateOrderWebhookInputSchema,
} from './commerce.js';

describe('order webhook settings', () => {
  it('defaults to every event with no endpoint', () => {
    const settings = readOrderWebhookSettings(null);
    expect(settings.url).toBe('');
    expect(settings.events).toEqual([
      'order.created',
      'order.paid',
      'order.status',
      'order.refunded',
    ]);
    expect(settings.secret).toBe('');
  });

  it('accepts https only', () => {
    expect(updateOrderWebhookInputSchema.safeParse({ url: 'http://hooks.test/x' }).success).toBe(
      false,
    );
    expect(updateOrderWebhookInputSchema.safeParse({ url: 'https://hooks.test/x' }).success).toBe(
      true,
    );
  });

  it('requires at least 16 characters when a secret is sent', () => {
    expect(updateOrderWebhookInputSchema.safeParse({ url: '', secret: 'short' }).success).toBe(
      false,
    );
    expect(
      updateOrderWebhookInputSchema.safeParse({ url: '', secret: 'a-long-enough-secret' }).success,
    ).toBe(true);
  });

  it('never exposes the secret in the admin view', () => {
    expect(
      orderWebhookViewSchema.parse({
        url: 'https://hooks.test/x',
        events: ['order.paid'],
        secretSet: true,
        enabled: true,
      }),
    ).not.toHaveProperty('secret');
  });
});

describe('order webhook payload', () => {
  it('accepts the test event and rejects unknown ones', () => {
    const payload = {
      event: ORDER_WEBHOOK_TEST_EVENT,
      sentAt: '2026-10-22T04:00:00.000Z',
      site: { id: 'site-1', name: 'ร้าน', url: 'https://shop.test' },
      order: {
        number: 'LM-1',
        status: 'paid',
        paymentMethod: 'promptpay',
        currency: 'THB',
        subtotal: 10_000,
        shippingFee: 0,
        total: 10_000,
        customer: { name: 'ลูกค้า' },
        items: [
          {
            title: 'สินค้า',
            variantLabel: null,
            quantity: 1,
            unitPrice: 10_000,
            lineTotal: 10_000,
          },
        ],
        trackingNumber: null,
        note: '',
        createdAt: '2026-10-22T03:00:00.000Z',
        paidAt: null,
        payment: { provider: null, providerRef: null, slipStatus: null, slipUrl: null },
      },
    };

    expect(orderWebhookPayloadSchema.safeParse(payload).success).toBe(true);
    expect(
      orderWebhookPayloadSchema.safeParse({ ...payload, event: 'order.deleted' }).success,
    ).toBe(false);
  });
});

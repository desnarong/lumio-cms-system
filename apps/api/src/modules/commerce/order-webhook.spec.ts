import { createHmac } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ORDER_WEBHOOK_TEST_EVENT, type OrderWebhookPayload } from '@lumio/shared';
import { encryptSecret } from '../../common/secret-box';
import {
  OrderWebhookNotifier,
  deliverWebhook,
  toWebhookPayload,
  webhookSignature,
  type WebhookOrderSource,
} from './order-webhook';

const KEY = 'test-encryption-key-for-webhooks';
const SECRET = 'a-very-long-signing-secret';
const SITE = { id: 'site-1', name: 'ร้านกาแฟบ้านดอย', url: 'https://baandoi.lumio.app' };

const order = (overrides: Partial<WebhookOrderSource> = {}): WebhookOrderSource => ({
  number: 'LM-261022-AB12',
  status: 'paid',
  paymentMethod: 'promptpay',
  currency: 'THB',
  subtotal: 25_000,
  shippingFee: 5_000,
  total: 30_000,
  customer: {
    name: 'อรุณี ใจดี',
    phone: '0891234567',
    email: null,
    address: '1 ถนนทดสอบ',
    subdistrict: 'บางรัก',
    district: 'บางรัก',
    province: 'กรุงเทพมหานคร',
    postcode: '10500',
  },
  note: '',
  trackingNumber: null,
  createdAt: '2026-10-22T03:00:00.000Z',
  paidAt: '2026-10-22T03:05:00.000Z',
  provider: null,
  providerRef: null,
  items: [{ title: 'กาแฟคั่วกลาง', variantLabel: 'M · ดำ', price: 25_000, quantity: 1 }],
  slips: [{ status: 'verified', imageUrl: 'https://cdn.test/slip.png' }],
  ...overrides,
});

const settings = (
  events: ('order.created' | 'order.paid' | 'order.status')[] = ['order.paid'],
) => ({
  url: 'https://hooks.example.com/lumio',
  events,
  secret: encryptSecret(SECRET, KEY),
});

const okFetch = () => vi.fn().mockResolvedValue({ ok: true, status: 200 } as unknown as Response);
const publicLookup = async () => [{ address: '203.0.113.10', family: 4 }];

beforeAll(() => {
  process.env.SECRETS_ENCRYPTION_KEY = KEY;
});

afterAll(() => {
  delete process.env.SECRETS_ENCRYPTION_KEY;
});

describe('toWebhookPayload', () => {
  it('describes the order, its items and the payment in a stable shape', () => {
    const payload = toWebhookPayload(SITE, 'order.paid', order(), new Date('2026-10-22T04:00:00Z'));

    expect(payload.site).toEqual(SITE);
    expect(payload.sentAt).toBe('2026-10-22T04:00:00.000Z');
    expect(payload.order.number).toBe('LM-261022-AB12');
    expect(payload.order.items[0]).toEqual({
      title: 'กาแฟคั่วกลาง',
      variantLabel: 'M · ดำ',
      quantity: 1,
      unitPrice: 25_000,
      lineTotal: 25_000,
    });
    expect(payload.order.payment).toMatchObject({
      slipStatus: 'verified',
      slipUrl: 'https://cdn.test/slip.png',
    });
  });
});

describe('webhookSignature', () => {
  it('signs the timestamp and body together', () => {
    const body = '{"a":1}';
    const expected = `sha256=${createHmac('sha256', SECRET).update(`1700000000.${body}`).digest('hex')}`;
    expect(webhookSignature(SECRET, 1_700_000_000, body)).toBe(expected);
  });
});

describe('deliverWebhook', () => {
  it('posts a signed JSON event with the event name in a header', async () => {
    const fetchImpl = okFetch();
    const payload = toWebhookPayload(SITE, 'order.paid', order());

    const result = await deliverWebhook(settings(), 'order.paid', payload, {
      fetchImpl: fetchImpl as unknown as typeof fetch,
      lookupImpl: publicLookup,
      now: () => new Date('2026-10-22T04:00:00Z'),
    });

    expect(result).toEqual({ delivered: true, status: 200, error: null });
    const [url, init] = fetchImpl.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe('https://hooks.example.com/lumio');
    const headers = init.headers as Record<string, string>;
    expect(headers['x-lumio-event']).toBe('order.paid');
    expect(headers['x-lumio-timestamp']).toBe('1792641600');
    expect(headers['x-lumio-signature']).toBe(
      webhookSignature(SECRET, 1_792_641_600, init.body as string),
    );
    expect(JSON.parse(init.body as string)).toMatchObject({ event: 'order.paid' });
  });

  it('refuses a hostname that resolves into the private network', async () => {
    const fetchImpl = okFetch();
    const result = await deliverWebhook(
      settings(),
      'order.paid',
      toWebhookPayload(SITE, 'order.paid', order()),
      {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        lookupImpl: async () => [{ address: '10.0.0.5', family: 4 }],
      },
    );

    expect(result.delivered).toBe(false);
    expect(result.error).toContain('สาธารณะ');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('does not retry a 4xx, but retries a 5xx until it succeeds', async () => {
    const rejected = vi.fn().mockResolvedValue({ ok: false, status: 400 } as unknown as Response);
    const first = await deliverWebhook(
      settings(),
      'order.paid',
      toWebhookPayload(SITE, 'order.paid', order()),
      {
        fetchImpl: rejected as unknown as typeof fetch,
        lookupImpl: publicLookup,
        retryDelayMs: 0,
      },
    );
    expect(first.status).toBe(400);
    expect(rejected).toHaveBeenCalledTimes(1);

    const flaky = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 } as unknown as Response)
      .mockResolvedValueOnce({ ok: true, status: 200 } as unknown as Response);
    const second = await deliverWebhook(
      settings(),
      'order.paid',
      toWebhookPayload(SITE, 'order.paid', order()),
      {
        fetchImpl: flaky as unknown as typeof fetch,
        lookupImpl: publicLookup,
        retryDelayMs: 0,
      },
    );
    expect(second.delivered).toBe(true);
    expect(flaky).toHaveBeenCalledTimes(2);
  });
});

describe('OrderWebhookNotifier', () => {
  it('skips events the owner did not subscribe to', async () => {
    const notifier = new OrderWebhookNotifier();
    const fetchImpl = okFetch();

    const result = await notifier.emit(
      SITE,
      { commerceWebhook: settings(['order.created']) },
      'order.paid',
      order(),
      { fetchImpl: fetchImpl as unknown as typeof fetch, lookupImpl: publicLookup },
    );

    expect(result).toEqual({ delivered: false, status: null, error: null });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('delivers a subscribed event and reads the secret from site settings', async () => {
    const notifier = new OrderWebhookNotifier();
    const fetchImpl = okFetch();

    const result = await notifier.emit(
      SITE,
      { commerceWebhook: settings(['order.paid']) },
      'order.paid',
      order(),
      { fetchImpl: fetchImpl as unknown as typeof fetch, lookupImpl: publicLookup },
    );

    expect(result.delivered).toBe(true);
    const payload = JSON.parse(
      (fetchImpl.mock.calls[0] as [URL, RequestInit])[1].body as string,
    ) as OrderWebhookPayload;
    expect(payload.order.total).toBe(30_000);
  });

  it('sends the test event regardless of the subscription', async () => {
    const notifier = new OrderWebhookNotifier();
    const fetchImpl = okFetch();

    const result = await notifier.emit(
      SITE,
      { commerceWebhook: settings([]) },
      ORDER_WEBHOOK_TEST_EVENT,
      order(),
      { fetchImpl: fetchImpl as unknown as typeof fetch, lookupImpl: publicLookup },
    );

    expect(result.delivered).toBe(true);
  });
});

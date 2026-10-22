import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BBL_WEBHOOK_ROUTE,
  buildBblPaymentBody,
  createBblPayment,
  parseBblPaymentSession,
  verifyBblWebhook,
  type BblPaymentRequest,
} from './bbl-gateway';
import { resetBblTokenCache, type BblConfig } from './bbl';

const config = (overrides: Partial<BblConfig> = {}): BblConfig => ({
  baseUrl: 'https://bbl.test',
  tokenPath: '/v1/oauth/token',
  transferPath: '/v1/payments/transactions',
  clientId: 'merchant-1',
  clientSecret: 'client-secret',
  apiKey: '',
  scope: 'payment.read',
  sandbox: false,
  ...overrides,
});

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const tokenResponse = (token = 'token-1') => json({ access_token: token, expires_in: 3600 });

const request = (overrides: Partial<BblPaymentRequest> = {}): BblPaymentRequest => ({
  siteId: '00000000-0000-4000-8000-0000000000b1',
  orderNumber: 'LM-261022-AB12',
  orderToken: 'token-1',
  amount: 40_000,
  customerEmail: 'arunee@example.com',
  description: 'คำสั่งซื้อ LM-261022-AB12',
  publicUrl: 'https://shop.example.com',
  apiUrl: 'https://api.example.com',
  ...overrides,
});

const event = (overrides: Record<string, unknown> = {}) => ({
  siteId: '00000000-0000-4000-8000-0000000000b1',
  paymentId: 'pay_1',
  orderNumber: 'LM-261022-AB12',
  status: 'paid',
  amount: 40_000,
  paidAt: '2026-10-22T10:00:00.000Z',
  transactionId: 'txn_1',
  ...overrides,
});

const signed = (body: string, secret: string, at = Date.now()) => {
  const timestamp = Math.floor(at / 1000);
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return {
    payload: Buffer.from(body),
    header: `t=${timestamp},v1=${signature}`,
  };
};

beforeEach(() => {
  resetBblTokenCache();
});

describe('Bangkok Bank payment page', () => {
  it('builds the form the hosted page expects', () => {
    const body = buildBblPaymentBody(request(), config());

    expect(body.get('merchantId')).toBe('merchant-1');
    expect(body.get('reference')).toBe('LM-261022-AB12');
    expect(body.get('amount')).toBe('400.00');
    expect(body.get('currency')).toBe('THB');
    expect(body.get('returnUrl')).toBe('https://shop.example.com/order/token-1?paid=1');
    expect(body.get('cancelUrl')).toBe('https://shop.example.com/order/token-1?cancelled=1');
    expect(body.get('notifyUrl')).toBe(`https://api.example.com${BBL_WEBHOOK_ROUTE}`);
    expect(body.get('metadata[siteId]')).toBe(request().siteId);
    expect(body.getAll('paymentMethods[]')).toEqual(['card', 'qr']);
    expect(body.get('customerEmail')).toBe('arunee@example.com');
  });

  it('opens a payment page and returns its id and URL', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        json({ paymentId: 'pay_1', redirectUrl: 'https://pay.bangkokbank.com/p/pay_1' }),
      );

    const session = await createBblPayment(fetchMock, request(), config());

    expect(session).toEqual({
      id: 'pay_1',
      url: 'https://pay.bangkokbank.com/p/pay_1',
    });
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe('https://bbl.test/v1/payments');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer token-1');
    expect(String(init.body)).toContain('merchantId=merchant-1');
  });

  it('accepts the aliases the bank uses for the same fields', () => {
    expect(parseBblPaymentSession({ data: { id: 'pay_2', url: 'https://pay.test/2' } })).toEqual({
      id: 'pay_2',
      url: 'https://pay.test/2',
    });
    expect(parseBblPaymentSession({ paymentId: 'pay_3' })).toBeNull();
  });

  it('refuses to open a page without merchant credentials', async () => {
    await expect(
      createBblPayment(vi.fn(), request(), config({ clientId: '', clientSecret: '' })),
    ).rejects.toMatchObject({ code: 'conflict' });
  });

  it('refuses a zero amount', async () => {
    await expect(createBblPayment(vi.fn(), request({ amount: 0 }), config())).rejects.toMatchObject(
      { code: 'validation_error' },
    );
  });

  it('reports a failed payment page as a conflict', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(json({ error: 'bad_request' }, 400));

    await expect(createBblPayment(fetchMock, request(), config())).rejects.toMatchObject({
      code: 'conflict',
    });
  });

  it('renews a rejected token once', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse('old'))
      .mockResolvedValueOnce(json({ error: 'expired' }, 401))
      .mockResolvedValueOnce(tokenResponse('new'))
      .mockResolvedValueOnce(json({ id: 'pay_1', url: 'https://pay.test/1' }));

    await expect(createBblPayment(fetchMock, request(), config())).resolves.toMatchObject({
      id: 'pay_1',
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

describe('Bangkok Bank callback', () => {
  const secret = 'webhook-secret';

  it('accepts a callback signed over the exact bytes', () => {
    const body = JSON.stringify(event());
    const signedBody = signed(body, secret);

    const verified = verifyBblWebhook(signedBody.payload, signedBody.header, secret);

    expect(verified).toMatchObject({ paymentId: 'pay_1', status: 'paid', amount: 40_000 });
  });

  it('rejects a body that was changed after signing', () => {
    const body = JSON.stringify(event());
    const signedBody = signed(body, secret);
    const tampered = Buffer.from(JSON.stringify(event({ amount: 1 })));

    expect(() => verifyBblWebhook(tampered, signedBody.header, secret)).toThrow();
  });

  it('rejects a signature from another shop secret', () => {
    const body = JSON.stringify(event());
    const signedBody = signed(body, secret);

    expect(() => verifyBblWebhook(signedBody.payload, signedBody.header, 'another-secret')).toThrow(
      'ลายเซ็นจากธนาคารไม่ถูกต้อง',
    );
  });

  it('rejects a stale signature', () => {
    const body = JSON.stringify(event());
    const signedBody = signed(body, secret, Date.now() - 10 * 60 * 1000);

    expect(() => verifyBblWebhook(signedBody.payload, signedBody.header, secret)).toThrow(
      'หมดอายุ',
    );
  });

  it('rejects a missing signature or secret', () => {
    const body = JSON.stringify(event());

    expect(() => verifyBblWebhook(Buffer.from(body), undefined, secret)).toThrow(
      'ไม่ผ่านการตรวจสอบ',
    );
    expect(() => verifyBblWebhook(Buffer.from(body), 't=1,v1=abc', '')).toThrow('Webhook Secret');
  });

  it('rejects a signed body that is not a valid event', () => {
    const body = JSON.stringify({ hello: 'world' });
    const signedBody = signed(body, secret);

    expect(() => verifyBblWebhook(signedBody.payload, signedBody.header, secret)).toThrow();
  });
});

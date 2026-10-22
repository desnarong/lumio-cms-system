import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encryptSecret } from '../../common/secret-box';
import type { CommerceService } from '../commerce/commerce.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { BankingService } from './banking.service';
import { BblGatewayService } from './bbl-gateway.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000b1';
const KEY = 'install-wide-test-key';
const SECRET = 'webhook-secret';

const event = (overrides: Record<string, unknown> = {}) => ({
  siteId: SITE_ID,
  paymentId: 'pay_1',
  orderNumber: 'LM-261022-AB12',
  status: 'paid',
  amount: 40_000,
  paidAt: '2026-10-22T10:00:00.000Z',
  transactionId: 'txn_1',
  ...overrides,
});

const signed = (body: string, secret = SECRET, at = Date.now()) => {
  const timestamp = Math.floor(at / 1000);
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return { payload: Buffer.from(body), header: `t=${timestamp},v1=${signature}` };
};

const orderRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'order-1',
  number: 'LM-261022-AB12',
  status: 'pending',
  total: 40_000,
  paymentMethod: 'bbl',
  ...overrides,
});

const stubs = (options: { order?: Record<string, unknown> | null; secret?: string } = {}) => {
  const auditCreate = vi.fn().mockResolvedValue({});
  const findOrder = vi
    .fn()
    .mockResolvedValue(options.order === undefined ? orderRow() : options.order);
  const tx = {
    order: { findFirst: findOrder },
    auditLog: { create: auditCreate },
  };
  const db = {
    forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx)),
  } as unknown as PrismaService;

  const settingsFor = vi.fn().mockResolvedValue({
    clientId: 'merchant-1',
    clientSecret: encryptSecret('client-secret', KEY),
    webhookSecret: options.secret === undefined ? encryptSecret(SECRET, KEY) : options.secret,
  });
  const banking = { settingsFor } as unknown as BankingService;
  const markPaid = vi.fn().mockResolvedValue(true);
  const commerce = { markOrderPaidByNumber: markPaid } as unknown as CommerceService;

  return {
    service: new BblGatewayService(db, banking, commerce),
    db,
    settingsFor,
    findOrder,
    auditCreate,
    markPaid,
  };
};

beforeEach(() => {
  vi.stubEnv('SECRETS_ENCRYPTION_KEY', KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('BblGatewayService', () => {
  it('marks the order paid when the signed callback matches the total', async () => {
    const all = stubs();
    const body = JSON.stringify(event());
    const signedBody = signed(body);

    const result = await all.service.handleWebhook(signedBody.payload, signedBody.header);

    expect(result).toEqual({ received: true, orderNumber: 'LM-261022-AB12', paid: true });
    expect(all.markPaid).toHaveBeenCalledWith(SITE_ID, 'LM-261022-AB12', 'pay_1');
    expect(all.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'order.payment.webhook',
        meta: expect.objectContaining({ amountMatches: true, status: 'paid' }),
      }),
    });
  });

  it('does not confirm an amount that differs from the order', async () => {
    const all = stubs();
    const signedBody = signed(JSON.stringify(event({ amount: 100 })));

    const result = await all.service.handleWebhook(signedBody.payload, signedBody.header);

    expect(result.paid).toBe(false);
    expect(all.markPaid).not.toHaveBeenCalled();
    expect(all.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        meta: expect.objectContaining({ amountMatches: false }),
      }),
    });
  });

  it('does not confirm a failed payment', async () => {
    const all = stubs();
    const signedBody = signed(JSON.stringify(event({ status: 'failed' })));

    const result = await all.service.handleWebhook(signedBody.payload, signedBody.header);

    expect(result.paid).toBe(false);
    expect(all.markPaid).not.toHaveBeenCalled();
  });

  it('is idempotent for an order that is already paid', async () => {
    const all = stubs({ order: orderRow({ status: 'paid' }) });
    const signedBody = signed(JSON.stringify(event()));

    const result = await all.service.handleWebhook(signedBody.payload, signedBody.header);

    expect(result.paid).toBe(true);
    expect(all.markPaid).not.toHaveBeenCalled();
  });

  it('audits a callback that matches no order', async () => {
    const all = stubs({ order: null });
    const signedBody = signed(JSON.stringify(event({ paymentId: 'pay_unknown' })));

    const result = await all.service.handleWebhook(signedBody.payload, signedBody.header);

    expect(result).toEqual({ received: true, orderNumber: null, paid: false });
    expect(all.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        target: 'pay_unknown',
        meta: expect.objectContaining({ result: 'unknown_payment' }),
      }),
    });
  });

  it('refuses a shop without a webhook secret', async () => {
    const all = stubs({ secret: '' });
    const signedBody = signed(JSON.stringify(event()));

    await expect(
      all.service.handleWebhook(signedBody.payload, signedBody.header),
    ).rejects.toMatchObject({ code: 'conflict' });
    expect(all.findOrder).not.toHaveBeenCalled();
  });

  it('rejects a forged signature before touching any order', async () => {
    const all = stubs();
    const body = JSON.stringify(event());
    const signedBody = signed(body, 'another-secret');

    await expect(
      all.service.handleWebhook(signedBody.payload, signedBody.header),
    ).rejects.toMatchObject({ code: 'unauthorized' });
    expect(all.findOrder).not.toHaveBeenCalled();
  });

  it('rejects a payload without a valid site', async () => {
    const all = stubs();
    const signedBody = signed(JSON.stringify(event({ siteId: 'not-a-uuid' })));

    await expect(
      all.service.handleWebhook(signedBody.payload, signedBody.header),
    ).rejects.toMatchObject({ code: 'validation_error' });
    expect(all.settingsFor).not.toHaveBeenCalled();
  });
});

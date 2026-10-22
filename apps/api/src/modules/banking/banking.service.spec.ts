import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decryptSecret, encryptSecret } from '../../common/secret-box';
import type { PrismaService } from '../prisma/prisma.service';
import { resetBblTokenCache } from './bbl';
import { BankingService } from './banking.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000b1';
const USER_ID = '00000000-0000-4000-8000-000000000002';
const ORDER_ID = '00000000-0000-4000-8000-0000000000c1';
const KEY = 'install-wide-test-key';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const tokenResponse = () => json({ access_token: 'token-1', expires_in: 3600 });

const transaction = (overrides: Record<string, unknown> = {}) => ({
  reference: 'BANK-1234',
  amount: '400.00',
  receivedAt: new Date().toISOString(),
  receiverAccount: '1234567890',
  senderName: 'อรุณี ใจดี',
  ...overrides,
});

const slipRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'slip-1',
  orderId: ORDER_ID,
  siteId: SITE_ID,
  status: 'pending_review',
  amount: 40_000,
  reference: 'BANK-1234',
  imageUrl: 'https://cdn.test/slip.png',
  note: '',
  reviewedBy: null,
  reviewedAt: null,
  createdAt: new Date('2026-10-22T09:00:00Z'),
  ...overrides,
});

const orderRow = (overrides: Record<string, unknown> = {}) => ({
  id: ORDER_ID,
  siteId: SITE_ID,
  status: 'pending',
  total: 40_000,
  paidAt: null,
  items: [],
  slips: [slipRow()],
  ...overrides,
});

/** Settings exactly as the admin leaves them: the secret is already a ciphertext. */
const linkedSettings = (overrides: Record<string, unknown> = {}) => ({
  banking: {
    provider: 'bbl',
    accountNumber: '1234567890',
    accountName: 'ร้านทดสอบ',
    autoVerifySlips: true,
    clientId: 'client-id',
    clientSecret: encryptSecret('client-secret', KEY),
    webhookSecret: encryptSecret('webhook-secret', KEY),
    apiKey: '',
    baseUrl: 'https://bbl.test',
    sandbox: false,
    ...overrides,
  },
});

interface StubOptions {
  settings?: Record<string, unknown>;
  order?: Record<string, unknown> | null;
}

const stubs = (options: StubOptions = {}) => {
  const siteUpdate = vi.fn().mockResolvedValue({});
  const auditCreate = vi.fn().mockResolvedValue({});
  const orderUpdate = vi.fn().mockResolvedValue({});
  const slipUpdate = vi.fn().mockResolvedValue({});

  const tx = {
    site: {
      findUnique: vi.fn().mockResolvedValue({ settings: options.settings ?? {} }),
      update: siteUpdate,
    },
    auditLog: { create: auditCreate },
    order: {
      findUnique: vi
        .fn()
        .mockResolvedValue(options.order === undefined ? orderRow() : options.order),
      update: orderUpdate,
    },
    paymentSlip: { update: slipUpdate },
  };

  const db = {
    forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx)),
  } as unknown as PrismaService;

  return {
    service: new BankingService(db),
    db,
    tx,
    siteUpdate,
    auditCreate,
    orderUpdate,
    slipUpdate,
  };
};

beforeEach(() => {
  vi.stubEnv('SECRETS_ENCRYPTION_KEY', KEY);
  resetBblTokenCache();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  resetBblTokenCache();
});

describe('BankingService connection', () => {
  it('reports a shop that has not connected a bank', async () => {
    const all = stubs();

    const connection = await all.service.connection(SITE_ID);

    expect(connection).toMatchObject({
      provider: 'bbl',
      connected: false,
      mode: 'not_configured',
      accountNumber: null,
      hasClientSecret: false,
      hasWebhookSecret: false,
      apiKeySet: false,
    });
    expect(connection.message).toContain('ยังไม่ได้เชื่อมต่อ');
  });

  it('masks the linked account and never returns the secret', async () => {
    const all = stubs({ settings: linkedSettings() });

    const connection = await all.service.connection(SITE_ID);

    expect(connection).toMatchObject({
      connected: true,
      mode: 'live',
      accountNumber: '123xxxx890',
      accountName: 'ร้านทดสอบ',
      clientId: 'client-id',
      hasClientSecret: true,
      hasWebhookSecret: true,
      apiKeySet: false,
      baseUrl: 'https://bbl.test',
      sandbox: false,
    });
    expect(JSON.stringify(connection)).not.toContain('client-secret');
    expect(all.db.forSite).toHaveBeenCalledWith(SITE_ID, expect.any(Function));
  });

  it('reports the sandbox mode when the shop ticked it', async () => {
    const all = stubs({ settings: linkedSettings({ sandbox: true }) });

    await expect(all.service.connection(SITE_ID)).resolves.toMatchObject({
      mode: 'sandbox',
      sandbox: true,
    });
  });

  it('reports credentials that still lack a webhook secret', async () => {
    const all = stubs({
      settings: {
        banking: {
          accountNumber: '1234567890',
          clientId: 'client-id',
          clientSecret: encryptSecret('client-secret', KEY),
        },
      },
    });

    const connection = await all.service.connection(SITE_ID);

    expect(connection.connected).toBe(false);
    expect(connection.hasWebhookSecret).toBe(false);
    expect(connection.message).toContain('Webhook Secret');
  });
});

describe('BankingService settings', () => {
  it('encrypts the secret entered in the admin and audits without it', async () => {
    const all = stubs();

    const connection = await all.service.updateSettings(
      SITE_ID,
      {
        accountNumber: '1234567890',
        accountName: 'ร้านทดสอบ',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        webhookSecret: 'webhook-secret',
        baseUrl: 'https://bbl.test',
      },
      USER_ID,
    );

    expect(connection.connected).toBe(true);
    expect(connection.hasClientSecret).toBe(true);

    const update = all.siteUpdate.mock.calls[0]?.[0] as {
      where: { id: string };
      data: {
        settings: {
          banking: { accountNumber: string; clientSecret: string; webhookSecret: string };
        };
      };
    };
    expect(update.where).toEqual({ id: SITE_ID });
    expect(update.data.settings.banking.accountNumber).toBe('1234567890');
    expect(update.data.settings.banking.clientSecret).toMatch(/^enc:v1:/);
    expect(update.data.settings.banking.clientSecret).not.toContain('client-secret');
    expect(decryptSecret(update.data.settings.banking.clientSecret, KEY)).toBe('client-secret');
    expect(update.data.settings.banking.webhookSecret).toMatch(/^enc:v1:/);
    expect(decryptSecret(update.data.settings.banking.webhookSecret, KEY)).toBe('webhook-secret');

    expect(JSON.stringify(all.auditCreate.mock.calls)).not.toContain('client-secret');
    expect(JSON.stringify(all.auditCreate.mock.calls)).not.toContain('webhook-secret');
  });

  it('keeps the stored secret when only the client id changes', async () => {
    const before = encryptSecret('client-secret', KEY);
    const all = stubs({ settings: linkedSettings({ clientSecret: before }) });

    await all.service.updateSettings(SITE_ID, { clientId: 'new-client-id' }, USER_ID);

    const update = all.siteUpdate.mock.calls[0]?.[0] as {
      data: { settings: { banking: { clientId: string; clientSecret: string } } };
    };
    expect(update.data.settings.banking.clientId).toBe('new-client-id');
    expect(update.data.settings.banking.clientSecret).toBe(before);
  });

  it('refuses to link an account before the credentials are entered', async () => {
    const all = stubs();

    await expect(
      all.service.updateSettings(SITE_ID, { accountNumber: '1234567890' }, USER_ID),
    ).rejects.toMatchObject({ code: 'validation_error' });
    expect(all.siteUpdate).not.toHaveBeenCalled();
  });

  it('creates an installation key when the deployment has none', async () => {
    vi.stubEnv('SECRETS_ENCRYPTION_KEY', '');
    const all = stubs();

    await all.service.updateSettings(
      SITE_ID,
      { accountNumber: '1234567890', clientId: 'id', clientSecret: 'client-secret' },
      USER_ID,
    );

    const update = all.siteUpdate.mock.calls[0]?.[0] as {
      data: { settings: { banking: { clientSecret: string } } };
    };
    expect(update.data.settings.banking.clientSecret.startsWith('enc:v1:')).toBe(true);
  });

  it('rejects an account number that is not ten digits', async () => {
    const all = stubs();

    await expect(
      all.service.updateSettings(SITE_ID, { accountNumber: '12345' }, USER_ID),
    ).rejects.toThrow('เลขบัญชีธนาคารกรุงเทพต้องเป็นตัวเลข 10 หลัก');
    expect(all.siteUpdate).not.toHaveBeenCalled();
  });

  it('rejects a bank URL that is not https', async () => {
    const all = stubs();

    await expect(
      all.service.updateSettings(SITE_ID, { baseUrl: 'http://bbl.test' }, USER_ID),
    ).rejects.toThrow('https');
  });

  it('clears the connection when the owner unlinks the account', async () => {
    const all = stubs({ settings: linkedSettings() });

    const connection = await all.service.updateSettings(SITE_ID, { accountNumber: null }, USER_ID);

    expect(connection.accountNumber).toBeNull();
    const update = all.siteUpdate.mock.calls[0]?.[0] as {
      data: { settings: { banking: { connectedAt: string | null; connectedBy: string | null } } };
    };
    expect(update.data.settings.banking.connectedAt).toBeNull();
    expect(update.data.settings.banking.connectedBy).toBeNull();
  });

  it('uses the stored secret and base URL when testing the connection', async () => {
    const fetchMock = vi.fn().mockResolvedValue(tokenResponse());
    vi.stubGlobal('fetch', fetchMock);
    const all = stubs({ settings: linkedSettings() });

    const connection = await all.service.testConnection(SITE_ID, USER_ID);

    expect(connection.lastCheckedAt).toEqual(expect.any(String));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://bbl.test/v1/oauth/token');
    expect((init.headers as Record<string, string>).authorization).toBe(
      `Basic ${Buffer.from('client-id:client-secret').toString('base64')}`,
    );
  });

  it('fails the connection test when the bank refuses the credentials', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: 'invalid_client' }, 401)));
    const all = stubs({ settings: linkedSettings() });

    await expect(all.service.testConnection(SITE_ID, USER_ID)).rejects.toMatchObject({
      code: 'conflict',
    });
    expect(all.siteUpdate).not.toHaveBeenCalled();
  });

  it('fails the connection test before any call when credentials are missing', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const all = stubs({ settings: { banking: { accountNumber: '1234567890' } } });

    await expect(all.service.testConnection(SITE_ID, USER_ID)).rejects.toMatchObject({
      code: 'conflict',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('BankingService transfers', () => {
  it('lists recent transfers using the shop credentials', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(json({ transactions: [transaction()] }));
    vi.stubGlobal('fetch', fetchMock);
    const all = stubs({ settings: linkedSettings() });

    const list = await all.service.transfers(SITE_ID, { limit: 20 });

    expect(list.provider).toBe('bbl');
    expect(list.accountNumber).toBe('123xxxx890');
    expect(list.items).toHaveLength(1);
    expect(list.items[0]).toMatchObject({ reference: 'BANK-1234', amount: 40_000 });
    const [url] = fetchMock.mock.calls[1] as [string];
    expect(url).toContain('https://bbl.test/v1/payments/transactions');
    expect(url).toContain('accountNumber=1234567890');
  });

  it('needs a linked account before asking the bank', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const all = stubs({ settings: linkedSettings({ accountNumber: null }) });

    await expect(all.service.transfers(SITE_ID, { limit: 20 })).rejects.toMatchObject({
      code: 'conflict',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('needs credentials before asking the bank', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const all = stubs({ settings: linkedSettings({ clientId: '', clientSecret: '' }) });

    await expect(all.service.transfers(SITE_ID, { limit: 20 })).rejects.toMatchObject({
      code: 'conflict',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('BankingService verifySlip', () => {
  const bankFetch = (transactions: unknown[] = [transaction()]) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(json({ transactions }));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };

  it('confirms the order when the bank reports the exact transfer', async () => {
    bankFetch();
    const all = stubs({ settings: linkedSettings() });

    const result = await all.service.verifySlip(SITE_ID, ORDER_ID, USER_ID);

    expect(result).toMatchObject({
      orderId: ORDER_ID,
      slipId: 'slip-1',
      orderStatus: 'paid',
      status: 'verified',
      matched: true,
    });
    expect(all.slipUpdate).toHaveBeenCalledWith({
      where: { id: 'slip-1' },
      data: expect.objectContaining({ status: 'verified', reviewedBy: USER_ID }),
    });
    expect(all.orderUpdate).toHaveBeenCalledWith({
      where: { id: ORDER_ID },
      data: { status: 'paid', paidAt: expect.any(Date) },
    });
    expect(all.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'order.status',
        meta: expect.objectContaining({ reason: 'bbl_api_verified' }),
      }),
    });
  });

  it('leaves the order pending when the bank reports another amount', async () => {
    bankFetch([transaction({ amount: '399.00' })]);
    const all = stubs({ settings: linkedSettings() });

    const result = await all.service.verifySlip(SITE_ID, ORDER_ID, USER_ID);

    expect(result.status).toBe('pending_review');
    expect(result.orderStatus).toBe('pending');
    expect(all.orderUpdate).not.toHaveBeenCalled();
    expect(all.slipUpdate).not.toHaveBeenCalled();
    expect(all.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'banking.slip.verify' }),
    });
  });

  it('keeps the order pending while the bank is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const all = stubs({ settings: linkedSettings() });

    const result = await all.service.verifySlip(SITE_ID, ORDER_ID, USER_ID);

    expect(result.status).toBe('unavailable');
    expect(all.orderUpdate).not.toHaveBeenCalled();
  });

  it('reports an order without a slip', async () => {
    const all = stubs({
      settings: linkedSettings(),
      order: orderRow({ slips: [] }),
    });

    await expect(all.service.verifySlip(SITE_ID, ORDER_ID, USER_ID)).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('reports a missing order', async () => {
    const all = stubs({ settings: linkedSettings(), order: null });

    await expect(all.service.verifySlip(SITE_ID, ORDER_ID, USER_ID)).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('needs a linked account before verifying', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const all = stubs({ settings: linkedSettings({ accountNumber: null }) });

    await expect(all.service.verifySlip(SITE_ID, ORDER_ID, USER_ID)).rejects.toMatchObject({
      code: 'conflict',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

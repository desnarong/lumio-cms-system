import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bblAccessToken,
  bblBaseUrl,
  bblConfigFor,
  bblConfigured,
  bblMode,
  buildBblTransferUrl,
  checkBblConnection,
  fetchBblToken,
  lookupBblTransfers,
  parseBblTransfer,
  resetBblTokenCache,
  satangFromBankAmount,
  verifyBblTransfer,
  type BblConfig,
} from './bbl';

const config = (overrides: Partial<BblConfig> = {}): BblConfig => ({
  baseUrl: 'https://bbl.test',
  tokenPath: '/v1/oauth/token',
  transferPath: '/v1/payments/transactions',
  clientId: 'client-id',
  clientSecret: 'client-secret',
  apiKey: '',
  scope: 'payment.read',
  sandbox: false,
  ...overrides,
});

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const tokenResponse = (token = 'token-1'): Response =>
  json({ access_token: token, token_type: 'Bearer', expires_in: 3600 });

const transaction = (overrides: Record<string, unknown> = {}) => ({
  reference: 'BANK-1234',
  amount: '400.00',
  receivedAt: '2026-10-22T09:00:00.000Z',
  receiverAccount: '1234567890',
  senderName: 'อรุณี ใจดี',
  senderAccount: '0987654321',
  channel: 'mobile',
  ...overrides,
});

const request = { accountNumber: '1234567890', reference: 'BANK-1234', amount: 40_000 };
const now = new Date('2026-10-22T10:00:00.000Z');

beforeEach(() => {
  resetBblTokenCache();
});

describe('bbl configuration', () => {
  it('is not configured without client credentials', () => {
    expect(bblConfigured(config({ clientId: '', clientSecret: '' }))).toBe(false);
    expect(bblMode(config({ clientId: '', clientSecret: '' }))).toBe('not_configured');
  });

  it('reports sandbox mode separately from live mode', () => {
    expect(bblMode(config())).toBe('live');
    expect(bblMode(config({ sandbox: true }))).toBe('sandbox');
  });
});

describe('config from shop settings', () => {
  it('uses the live host and the published paths by default', () => {
    expect(bblConfigFor({ clientId: ' client-id ', clientSecret: 'client-secret' })).toMatchObject({
      baseUrl: 'https://api.bangkokbank.com',
      tokenPath: '/v1/oauth/token',
      transferPath: '/v1/payments/transactions',
      clientId: 'client-id',
      sandbox: false,
    });
  });

  it('uses the sandbox host when the shop selected sandbox', () => {
    expect(bblBaseUrl({ sandbox: true })).toBe('https://sandbox.api.bangkokbank.com');
  });

  it('keeps a custom host and drops its trailing slash', () => {
    expect(bblBaseUrl({ baseUrl: 'https://bbl.shop.test/', sandbox: true })).toBe(
      'https://bbl.shop.test',
    );
  });
});

describe('access token', () => {
  it('uses basic auth and the client-credentials grant', async () => {
    const fetchMock = vi.fn().mockResolvedValue(tokenResponse());

    const token = await fetchBblToken(fetchMock, config(), 1_000);

    expect(token.accessToken).toBe('token-1');
    expect(token.expiresAt).toBe(1_000 + 3_600_000);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://bbl.test/v1/oauth/token');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).authorization).toBe(
      `Basic ${Buffer.from('client-id:client-secret').toString('base64')}`,
    );
    expect(String(init.body)).toContain('grant_type=client_credentials');
  });

  it('reuses the cached token until it is close to expiry', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => tokenResponse());

    await bblAccessToken(fetchMock, config(), 1_000);
    await bblAccessToken(fetchMock, config(), 2_000);
    expect(fetchMock).toHaveBeenCalledOnce();

    await bblAccessToken(fetchMock, config(), 3_600_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('refuses to call the bank without credentials', async () => {
    await expect(
      fetchBblToken(vi.fn(), config({ clientId: '', clientSecret: '' })),
    ).rejects.toMatchObject({ code: 'conflict' });
  });

  it('reports an unreadable token body as a conflict', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ error: 'invalid_client' }));

    await expect(fetchBblToken(fetchMock, config())).rejects.toMatchObject({
      code: 'conflict',
    });
  });
});

describe('transfers', () => {
  it('converts the bank amount from decimal baht to satang', () => {
    expect(satangFromBankAmount('1,290.50')).toBe(129_050);
    expect(satangFromBankAmount(400)).toBe(40_000);
    expect(satangFromBankAmount('12.345')).toBeNull();
    expect(satangFromBankAmount('')).toBeNull();
  });

  it('maps the aliases BBL uses for the same statement line', () => {
    const mapped = parseBblTransfer({
      transactionReference: 'REF-9',
      creditAmount: '1,290.50',
      transactionDateTime: '2026-10-22T09:00:00.000Z',
      toAccount: '1234567890',
      payerName: 'สมชาย',
    });

    expect(mapped).toMatchObject({
      reference: 'REF-9',
      amount: 129_050,
      receiverAccount: '1234567890',
      senderName: 'สมชาย',
    });
  });

  it('drops a line without a reference or amount', () => {
    expect(parseBblTransfer({ amount: '400.00' })).toBeNull();
    expect(parseBblTransfer({ reference: 'REF-9' })).toBeNull();
  });

  it('sends the account, reference and window as query parameters', () => {
    const url = new URL(
      buildBblTransferUrl(config(), {
        accountNumber: '1234567890',
        reference: 'BANK-1234',
        from: new Date('2026-10-21T00:00:00.000Z'),
        to: now,
        limit: 500,
      }),
    );

    expect(url.origin + url.pathname).toBe('https://bbl.test/v1/payments/transactions');
    expect(url.searchParams.get('accountNumber')).toBe('1234567890');
    expect(url.searchParams.get('reference')).toBe('BANK-1234');
    expect(url.searchParams.get('limit')).toBe('100');
    expect(url.searchParams.get('from')).toBe('2026-10-21T00:00:00.000Z');
  });

  it('reads the list out of the envelope and skips broken lines', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(json({ data: { transactions: [transaction(), { bad: true }] } }));

    const items = await lookupBblTransfers(
      fetchMock,
      { accountNumber: '1234567890', reference: 'BANK-1234' },
      config(),
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ reference: 'BANK-1234', amount: 40_000 });
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toContain('accountNumber=1234567890');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer token-1');
  });

  it('renews a rejected token once', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse('old'))
      .mockResolvedValueOnce(json({ error: 'expired' }, 401))
      .mockResolvedValueOnce(tokenResponse('new'))
      .mockResolvedValueOnce(json({ transactions: [transaction()] }));

    const items = await lookupBblTransfers(fetchMock, { accountNumber: '1234567890' }, config());

    expect(items).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const lastGet = fetchMock.mock.calls[3] as [string, RequestInit];
    expect((lastGet[1].headers as Record<string, string>).authorization).toBe('Bearer new');
  });

  it('turns a network failure into a readable conflict', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));

    await expect(
      lookupBblTransfers(fetchMock, { accountNumber: '1234567890' }, config()),
    ).rejects.toMatchObject({ code: 'conflict' });
  });
});

describe('verifyBblTransfer', () => {
  it('confirms a transfer the bank reports for the exact reference and amount', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(json({ transactions: [transaction()] }));

    const result = await verifyBblTransfer(fetchMock, request, config(), now);

    expect(result.status).toBe('verified');
    expect(result.matched).toBe(true);
    expect(result.transfer?.reference).toBe('BANK-1234');
  });

  it('keeps the slip for review when the amount differs', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(json({ transactions: [transaction({ amount: '399.00' })] }));

    const result = await verifyBblTransfer(fetchMock, request, config(), now);

    expect(result.status).toBe('pending_review');
    expect(result.matched).toBe(false);
    expect(result.transfer).toBeNull();
  });

  it('keeps the slip for review when the bank is unreachable', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));

    const result = await verifyBblTransfer(fetchMock, request, config(), now);

    expect(result.status).toBe('unavailable');
    expect(result.message).toContain('เก็บสลิป');
  });

  it('does not call the bank when the server has no credentials', async () => {
    const fetchMock = vi.fn();

    const result = await verifyBblTransfer(
      fetchMock,
      request,
      config({ clientId: '', clientSecret: '' }),
      now,
    );

    expect(result.status).toBe('unavailable');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts a transfer the bank masks down to the last four digits', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        json({ transactions: [transaction({ receiverAccount: 'xxx-x-x6789-0' })] }),
      );

    const result = await verifyBblTransfer(fetchMock, request, config(), now);

    expect(result.status).toBe('verified');
  });
});

describe('checkBblConnection', () => {
  it('asks for a fresh token and reports the mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue(tokenResponse());

    await expect(checkBblConnection(fetchMock, config({ sandbox: true }))).resolves.toBe('sandbox');
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

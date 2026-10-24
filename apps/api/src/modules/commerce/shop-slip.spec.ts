import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encryptSecret } from '../../common/secret-box';
import type { MediaStorage } from '../media/media.storage';
import type { PrismaService } from '../prisma/prisma.service';
import type { PublicService } from '../public/public.service';
import type { OrderNotifier } from './order-notifier';
import { ShopService } from './shop.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const tokenResponse = () => json({ access_token: 'token-1', expires_in: 3600 });

const service = (
  status = 'pending',
  settings: Record<string, unknown> = { commerce: { promptPayId: '0812345678' } },
) => {
  const order = {
    id: 'order-1',
    siteId: SITE_ID,
    number: 'LM-261022-AB12',
    token: 'token-1',
    status,
    paymentMethod: 'promptpay',
    customer: { name: 'อรุณี ใจดี', phone: '0891234567' },
    note: '',
    subtotal: 35_000,
    shippingFee: 5_000,
    total: 40_000,
    currency: 'THB',
    trackingNumber: null,
    paymentUrl: null,
    provider: null,
    providerRef: null,
    paidAt: null,
    sellerTransferId: null,
    sellerTransferAt: null,
    createdAt: new Date('2026-10-22T09:00:00Z'),
    updatedAt: new Date('2026-10-22T09:00:00Z'),
    items: [],
    slips: [],
  };
  const paymentSlip = { create: vi.fn().mockResolvedValue({}) };
  const orderUpdate = vi.fn().mockResolvedValue({});
  const auditCreate = vi.fn().mockResolvedValue({});
  const tx = {
    order: {
      findUnique: vi.fn().mockResolvedValue(order),
      update: orderUpdate,
    },
    paymentSlip: { ...paymentSlip, findFirst: vi.fn().mockResolvedValue(null) },
    auditLog: { create: auditCreate },
  };
  const db = {
    forSite: vi.fn(async (_site: string, fn: (client: unknown) => unknown) => fn(tx)),
  } as unknown as PrismaService;
  const publicContent = {
    chrome: vi.fn().mockResolvedValue({
      siteId: SITE_ID,
      site: {
        id: SITE_ID,
        name: 'ร้านทดสอบ',
        subdomain: 'shop',
        settings,
        themeTokens: {},
        localeDefault: 'th',
        locales: ['th'],
        logoUrl: null,
        faviconUrl: null,
      },
      menus: { header: [], footer: [] },
      globalBlocks: { header: [], footer: [] },
      locale: 'th',
    }),
  } as unknown as PublicService;
  const notifier = {
    statusChanged: vi.fn().mockResolvedValue(undefined),
    created: vi.fn().mockResolvedValue(undefined),
  } as unknown as OrderNotifier;
  const storage = {
    put: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  } as unknown as MediaStorage;

  return {
    shop: new ShopService(db, publicContent, notifier, undefined, storage),
    tx,
    orderUpdate,
    auditCreate,
    storage,
    notifier,
  };
};

const slip = {
  amount: 40_000,
  reference: 'BANK-1234',
  image: `data:image/png;base64,${PNG.toString('base64')}`,
};

const KEY = 'install-wide-test-key';

const bankSettings = (overrides: Record<string, unknown> = {}) => ({
  commerce: { promptPayId: '0812345678' },
  banking: {
    accountNumber: '1234567890',
    autoVerifySlips: true,
    clientId: 'client-id',
    clientSecret: encryptSecret('client-secret', KEY),
    baseUrl: 'https://bbl.test',
    ...overrides,
  },
});

beforeEach(() => {
  vi.stubEnv('SECRETS_ENCRYPTION_KEY', KEY);
});

const bankTransaction = (overrides: Record<string, unknown> = {}) => ({
  reference: 'BANK-1234',
  amount: '400.00',
  receivedAt: new Date().toISOString(),
  receiverAccount: '1234567890',
  ...overrides,
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('ShopService payment slip', () => {
  it('confirms the order automatically when the amount matches', async () => {
    const all = service();

    const result = await all.shop.submitSlip('shop.example.com', 'token-1', slip);

    expect(result.autoVerified).toBe(true);
    expect(result.status).toBe('verified');
    expect(all.storage.put).toHaveBeenCalledOnce();
    expect(all.orderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'paid', paidAt: expect.any(Date) },
    });
    await vi.waitFor(() => expect(all.notifier.statusChanged).toHaveBeenCalledOnce());
  });

  it('keeps a slip for review when the amount differs', async () => {
    const all = service();

    const result = await all.shop.submitSlip('shop.example.com', 'token-1', {
      ...slip,
      amount: 10_000,
    });

    expect(result.autoVerified).toBe(false);
    expect(result.status).toBe('pending_review');
    expect(all.orderUpdate).not.toHaveBeenCalled();
  });

  it('confirms the slip when Bangkok Bank reports the exact transfer', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(json({ transactions: [bankTransaction()] })),
    );
    const all = service('pending', bankSettings());

    const result = await all.shop.submitSlip('shop.example.com', 'token-1', slip);

    expect(result.autoVerified).toBe(true);
    expect(result.message).toContain('ธนาคารยืนยัน');
    expect(all.orderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { status: 'paid', paidAt: expect.any(Date) },
    });
    expect(all.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        meta: expect.objectContaining({ reason: 'bbl_api_verified' }),
      }),
    });
  });

  it('does not trust the typed amount when the bank cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const all = service('pending', bankSettings());

    const result = await all.shop.submitSlip('shop.example.com', 'token-1', slip);

    expect(result.autoVerified).toBe(false);
    expect(result.status).toBe('pending_review');
    expect(all.orderUpdate).not.toHaveBeenCalled();
  });

  it('does not confirm a transfer the bank reports for another account', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(
          json({ transactions: [bankTransaction({ receiverAccount: '9999999999' })] }),
        ),
    );
    const all = service('pending', bankSettings());

    const result = await all.shop.submitSlip('shop.example.com', 'token-1', slip);

    expect(result.autoVerified).toBe(false);
    expect(all.orderUpdate).not.toHaveBeenCalled();
  });

  it('skips the bank when the shop turned automatic verification off', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const all = service('pending', bankSettings({ autoVerifySlips: false }));

    const result = await all.shop.submitSlip('shop.example.com', 'token-1', slip);

    expect(result.autoVerified).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a slip for an order that is no longer pending', async () => {
    const all = service('paid');

    await expect(all.shop.submitSlip('shop.example.com', 'token-1', slip)).rejects.toMatchObject({
      code: 'conflict',
    });
    expect(all.storage.put).not.toHaveBeenCalled();
  });

  it('rejects a file that is not a real image', async () => {
    const all = service();

    await expect(
      all.shop.submitSlip('shop.example.com', 'token-1', {
        ...slip,
        image: `data:image/png;base64,${Buffer.alloc(200, 1).toString('base64')}`,
      }),
    ).rejects.toMatchObject({ code: 'validation_error' });
  });
});

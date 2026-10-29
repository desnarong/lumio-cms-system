import { describe, expect, it, vi, type Mock } from 'vitest';
import { encryptSecret } from '../../common/secret-box';
import type { PrismaService } from '../prisma/prisma.service';
import type { PublicService } from '../public/public.service';
import type { OrderNotifier } from './order-notifier';
import { ShopService } from './shop.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const PRODUCT_ID = '3f1a8b0c-1111-4c22-9d33-444455556666';
const MEDIA_ID = '5e2b9c1d-2222-4d33-8e44-555566667777';
const VARIANT_ID = '9d4e5f60-1111-4a22-8b33-ccccddddeeee';

const productRow = (overrides: Record<string, unknown> = {}) => ({
  id: PRODUCT_ID,
  siteId: SITE_ID,
  title: 'กาแฟคั่วกลาง',
  slug: 'medium-roast',
  description: 'คั่วกลาง',
  price: 35_000,
  compareAtPrice: null,
  currency: 'THB',
  images: [MEDIA_ID],
  stock: 10,
  category: 'เมล็ดกาแฟ',
  status: 'active',
  createdAt: new Date('2026-10-20T09:00:00Z'),
  updatedAt: new Date('2026-10-20T09:00:00Z'),
  ...overrides,
});

const mediaRow = {
  id: MEDIA_ID,
  siteId: SITE_ID,
  storageKey: 'shop/beans.jpg',
  variants: [{ w: 640, format: 'webp', url: 'shop/beans-640.webp' }],
  status: 'ready',
};

const orderRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'order-1',
  siteId: SITE_ID,
  number: 'LM-261022-AB12',
  token: 'token-1',
  status: 'pending',
  paymentMethod: 'promptpay',
  customer: {
    name: 'อรุณี ใจดี',
    phone: '0891234567',
    email: null,
    address: '128 นิมมาน',
    subdistrict: 'สุเทพ',
    district: 'เมือง',
    province: 'เชียงใหม่',
    postcode: '50200',
  },
  note: '',
  subtotal: 35_000,
  shippingFee: 5_000,
  total: 40_000,
  currency: 'THB',
  trackingNumber: null,
  paidAt: null,
  createdAt: new Date('2026-10-22T09:00:00Z'),
  updatedAt: new Date('2026-10-22T09:00:00Z'),
  ...overrides,
});

const orderItems = [
  {
    id: 'item-1',
    orderId: 'order-1',
    siteId: SITE_ID,
    productId: PRODUCT_ID,
    title: 'กาแฟคั่วกลาง',
    price: 35_000,
    quantity: 2,
    image: null,
  },
];

const customer = {
  name: 'อรุณี ใจดี',
  phone: '0891234567',
  email: null,
  address: '128 นิมมาน',
  subdistrict: 'สุเทพ',
  district: 'เมือง',
  province: 'เชียงใหม่',
  postcode: '50200',
};

interface Stubs {
  db: PrismaService;
  publicContent: PublicService;
  tx: Record<string, unknown>;
  orderCreate: Mock;
  productUpdateMany: Mock;
  auditCreate: Mock;
  notifier: OrderNotifier;
  created: Mock;
}

const chrome = (
  commerce: Record<string, unknown> = { promptPayId: '0812345678' },
  banking?: Record<string, unknown>,
) => ({
  siteId: SITE_ID,
  site: {
    id: SITE_ID,
    name: 'กาแฟบ้านดอย',
    subdomain: 'baandoi',
    localeDefault: 'th',
    locales: ['th'],
    themeTokens: {},
    settings: {
      commerce: {
        promptPayId: '0812345678',
        shippingFee: 5_000,
        freeShippingThreshold: 50_000,
        payments: { promptpay: true, cod: true },
        ...commerce,
      },
      ...(banking ? { banking } : {}),
    },
    logoUrl: null,
    faviconUrl: null,
  },
  menus: { header: [], footer: [] },
  globalBlocks: { header: [], footer: [] },
  locale: 'th',
});

const bundlePromotion = {
  id: 'promo-1',
  siteId: SITE_ID,
  title: 'ซื้อ 10 แถม 1',
  description: '',
  kind: 'bundle',
  badge: '',
  buyQty: 10,
  getQty: 1,
  startsAt: null,
  endsAt: null,
  active: true,
  sort: 0,
  createdAt: new Date('2026-10-01T00:00:00Z'),
  updatedAt: new Date('2026-10-01T00:00:00Z'),
};

const stubs = (
  options: {
    products?: unknown[];
    product?: unknown;
    order?: unknown;
    promotions?: unknown[];
    stockUpdateCount?: number;
    chrome?: ReturnType<typeof chrome>;
  } = {},
): Stubs => {
  const orderCreate = vi.fn().mockResolvedValue(orderRow());
  const productUpdateMany = vi.fn().mockResolvedValue({ count: options.stockUpdateCount ?? 1 });
  const auditCreate = vi.fn().mockResolvedValue({});

  const tx = {
    site: {
      findUnique: vi.fn().mockResolvedValue({
        owner: { email: 'owner@example.com' },
        domains: [],
      }),
    },
    product: {
      findMany: vi.fn().mockResolvedValue(options.products ?? [productRow()]),
      findFirst: vi.fn().mockResolvedValue('product' in options ? options.product : productRow()),
      updateMany: productUpdateMany,
    },
    media: { findMany: vi.fn().mockResolvedValue([mediaRow]) },
    promotion: { findMany: vi.fn().mockResolvedValue(options.promotions ?? []) },
    order: {
      create: orderCreate,
      findUnique: vi
        .fn()
        .mockResolvedValue(
          'order' in options ? options.order : orderRow({ ...orderItems, items: undefined }),
        ),
    },
    orderItem: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockResolvedValue(orderItems),
    },
    auditLog: { create: auditCreate },
  };

  const db = {
    forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx)),
  } as unknown as PrismaService;

  const publicContent = {
    chrome: vi.fn().mockResolvedValue(options.chrome ?? chrome()),
  } as unknown as PublicService;

  const created = vi.fn().mockResolvedValue(undefined);
  const notifier = {
    created,
    statusChanged: vi.fn().mockResolvedValue(undefined),
  } as unknown as OrderNotifier;

  return { db, publicContent, tx, orderCreate, productUpdateMany, auditCreate, notifier, created };
};

const service = (all: Stubs): ShopService =>
  new ShopService(all.db, all.publicContent, all.notifier);

const orderInput = {
  items: [{ productId: PRODUCT_ID, quantity: 2 }],
  customer,
  paymentMethod: 'promptpay' as const,
  note: '',
};

describe('ShopService catalog', () => {
  it('returns active products with public image urls and categories', async () => {
    const all = stubs();
    const home = await service(all).home('baandoi.example.com');

    expect(home.products[0]?.images[0]).toContain('shop/beans-640.webp');
    expect(home.categories).toEqual(['เมล็ดกาแฟ']);
    expect(home.settings.promptPayId).toBe('0812345678');
  });

  it('finds one product and suggests related items', async () => {
    const all = stubs({ products: [] });
    const page = await service(all).product('baandoi.example.com', 'medium-roast');

    expect(page.product.slug).toBe('medium-roast');
    expect(page.related).toEqual([]);
  });

  it('answers 404 for a product that is not on sale', async () => {
    const all = stubs({ product: null });
    await expect(service(all).product('baandoi.example.com', 'gone')).rejects.toMatchObject({
      code: 'not_found',
    });
  });
});

describe('ShopService cart', () => {
  it('adds a free unit when the cart reaches a "ซื้อ 10 แถม 1" offer', async () => {
    const all = stubs({
      products: [productRow({ price: 30_000, stock: 50 })],
      promotions: [bundlePromotion],
    });

    const { cart } = await service(all).cart('baandoi.example.com', {
      items: [{ productId: PRODUCT_ID, quantity: 10 }],
    });

    expect(cart.items[0]).toMatchObject({ quantity: 10, freeQuantity: 1 });
    expect(cart.freeCount).toBe(1);
    // The gift is not charged: ten units are paid for.
    expect(cart.total).toBe(300_000);
    expect(cart.promotions).toEqual([{ title: 'ซื้อ 10 แถม 1', freeQuantity: 1 }]);
  });

  it('refuses a quantity whose gift would exceed the stock', async () => {
    const all = stubs({
      products: [productRow({ price: 30_000, stock: 10 })],
      promotions: [bundlePromotion],
    });

    await expect(
      service(all).cart('baandoi.example.com', {
        items: [{ productId: PRODUCT_ID, quantity: 10 }],
      }),
    ).rejects.toMatchObject({ code: 'conflict' });
  });

  it('prices lines from the database and applies free shipping', async () => {
    const all = stubs({ products: [productRow({ price: 30_000 })] });
    const { cart } = await service(all).cart('baandoi.example.com', {
      items: [{ productId: PRODUCT_ID, quantity: 2 }],
    });

    expect(cart.subtotal).toBe(60_000);
    expect(cart.shippingFee).toBe(0);
    expect(cart.total).toBe(60_000);
    expect(cart.count).toBe(2);
  });

  it('charges shipping below the threshold', async () => {
    const all = stubs({ products: [productRow({ price: 10_000 })] });
    const { cart } = await service(all).cart('baandoi.example.com', {
      items: [{ productId: PRODUCT_ID, quantity: 1 }],
    });

    expect(cart.shippingFee).toBe(5_000);
    expect(cart.total).toBe(15_000);
  });

  it('prices the chosen variant instead of the product price', async () => {
    const all = stubs({
      products: [
        productRow({
          options: [{ name: 'ไซซ์', values: ['S', 'M'] }],
          variants: [
            {
              id: VARIANT_ID,
              siteId: SITE_ID,
              productId: PRODUCT_ID,
              signature: 'ไซซ์=M',
              options: { ไซซ์: 'M' },
              label: 'M',
              sku: null,
              price: 39_000,
              compareAtPrice: null,
              stock: 4,
              position: 0,
              createdAt: new Date('2026-10-20T09:00:00Z'),
              updatedAt: new Date('2026-10-20T09:00:00Z'),
            },
          ],
        }),
      ],
    });
    const { cart } = await service(all).cart('baandoi.example.com', {
      items: [{ productId: PRODUCT_ID, variantId: VARIANT_ID, quantity: 2 }],
    });

    expect(cart.items[0]?.variantLabel).toBe('M');
    expect(cart.items[0]?.lineTotal).toBe(78_000);
  });

  it('asks for a variant when the product has options', async () => {
    const all = stubs({
      products: [productRow({ options: [{ name: 'ไซซ์', values: ['S', 'M'] }], variants: [] })],
    });

    await expect(
      service(all).cart('baandoi.example.com', { items: [{ productId: PRODUCT_ID, quantity: 1 }] }),
    ).rejects.toMatchObject({ code: 'conflict' });
  });
  it('rejects a product that went off sale', async () => {
    const all = stubs({ products: [] });
    await expect(
      service(all).cart('baandoi.example.com', { items: [{ productId: PRODUCT_ID, quantity: 1 }] }),
    ).rejects.toMatchObject({ code: 'conflict' });
  });
});

describe('ShopService checkout', () => {
  it('writes the gift as a zero-price line and takes it from stock', async () => {
    const all = stubs({
      products: [productRow({ price: 30_000, stock: 50 })],
      promotions: [bundlePromotion],
    });

    await service(all).createOrder('baandoi.example.com', {
      ...orderInput,
      items: [{ productId: PRODUCT_ID, quantity: 10 }],
    });

    const createMany = (all.tx as { orderItem: { createMany: Mock } }).orderItem.createMany;
    const data = (createMany.mock.calls[0]?.[0] as { data: Record<string, unknown>[] }).data;
    expect(data).toHaveLength(2);
    expect(data[1]).toMatchObject({ price: 0, quantity: 1 });
    expect(all.productUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { stock: { decrement: 11 } } }),
    );
  });

  it('ignores a filled honeypot', async () => {
    const all = stubs();
    await expect(
      service(all).createOrder('baandoi.example.com', { ...orderInput, honeypot: 'bot' }),
    ).rejects.toMatchObject({ code: 'validation_error' });
    expect(all.orderCreate).not.toHaveBeenCalled();
  });

  it('refuses a payment method the shop turned off', async () => {
    const all = stubs({ chrome: chrome({ payments: { promptpay: false, cod: true } }) });
    await expect(service(all).createOrder('baandoi.example.com', orderInput)).rejects.toMatchObject({
      code: 'validation_error',
    });
  });

  it('refuses PromptPay before the shop configured a number', async () => {
    const all = stubs({ chrome: chrome({ promptPayId: null }) });
    await expect(service(all).createOrder('baandoi.example.com', orderInput)).rejects.toMatchObject({
      code: 'conflict',
    });
  });

  it('creates the order from server prices, takes stock and returns a QR payload', async () => {
    const all = stubs();
    const created = await service(all).createOrder('baandoi.example.com', orderInput);

    expect(all.orderCreate).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(all.created).toHaveBeenCalledOnce());
    const data = all.orderCreate.mock.calls[0]![0].data as {
      number: string;
      subtotal: number;
      shippingFee: number;
      total: number;
      paymentMethod: string;
    };
    expect(data.number).toMatch(/^LM-\d{6}-[A-Z0-9]{4,6}$/);
    expect(data.subtotal).toBe(70_000);
    expect(data.shippingFee).toBe(0);
    expect(data.total).toBe(70_000);
    expect(all.productUpdateMany).toHaveBeenCalledWith({
      where: { id: PRODUCT_ID, OR: [{ stock: null }, { stock: { gte: 2 } }] },
      data: { stock: { decrement: 2 } },
    });
    expect(created.payment.promptPayPayload?.startsWith('000201')).toBe(true);
    expect(created.order.customerPhone).toBe('08xxxxx567');
  });

  it('refuses an order when the last item was taken meanwhile', async () => {
    const all = stubs({ stockUpdateCount: 0 });
    await expect(service(all).createOrder('baandoi.example.com', orderInput)).rejects.toMatchObject({
      code: 'conflict',
    });
  });

  it('refuses a quantity above what is in stock', async () => {
    const all = stubs({ products: [productRow({ stock: 1 })] });
    await expect(service(all).createOrder('baandoi.example.com', orderInput)).rejects.toMatchObject({
      code: 'conflict',
    });
  });
});

describe('ShopService order lookup', () => {
  it('shows the order by token with a masked phone', async () => {
    const all = stubs({
      order: orderRow({ items: orderItems }),
    });
    const found = await service(all).order('baandoi.example.com', 'token-1');

    expect(found.order.number).toBe('LM-261022-AB12');
    expect(found.order.customerPhone).toBe('08xxxxx567');
    expect(found.payment.promptPayPayload?.startsWith('000201')).toBe(true);
  });

  it('answers 404 for an unknown token', async () => {
    const all = stubs({ order: null });
    await expect(service(all).order('baandoi.example.com', 'nope')).rejects.toMatchObject({
      code: 'not_found',
    });
  });
});

describe('ShopService bank gateway checkout', () => {
  it('opens a Bangkok Bank payment page and returns it to the buyer', async () => {
    const key = 'install-wide-test-key';
    vi.stubEnv('SECRETS_ENCRYPTION_KEY', key);
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'token-1', expires_in: 3600 }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ paymentId: 'pay_1', redirectUrl: 'https://pay.bank/pay_1' }),
          { status: 200 },
        ),
      );
    const all = stubs({
      chrome: chrome(
        { payments: { promptpay: true, cod: true, card: false, bbl: true } },
        {
          clientId: 'merchant-1',
          clientSecret: encryptSecret('client-secret', key),
          webhookSecret: encryptSecret('webhook-secret', key),
        },
      ),
    });
    all.orderCreate.mockResolvedValue(orderRow({ paymentMethod: 'bbl' }));
    const orderUpdate = vi.fn().mockResolvedValue({});
    (all.tx.order as { update: unknown }).update = orderUpdate;

    const created = await service(all).createOrder('baandoi.example.com', {
      ...orderInput,
      paymentMethod: 'bbl',
    });

    expect(created.payment.redirectUrl).toBe('https://pay.bank/pay_1');
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { provider: 'bbl', providerRef: 'pay_1', paymentUrl: 'https://pay.bank/pay_1' },
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('refuses the method when the shop has not entered gateway credentials', async () => {
    const all = stubs({
      chrome: chrome({ payments: { promptpay: true, cod: true, card: false, bbl: true } }),
    });

    await expect(
      service(all).createOrder('baandoi.example.com', { ...orderInput, paymentMethod: 'bbl' }),
    ).rejects.toMatchObject({ code: 'conflict' });
    expect(all.orderCreate).not.toHaveBeenCalled();
  });
});

describe('ShopService card checkout', () => {
  it('creates a Stripe page and returns it to the buyer', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'cs_1', url: 'https://checkout.stripe.com/c/cs_1' }), {
        status: 200,
      }),
    );
    const all = stubs({
      chrome: chrome({ payments: { promptpay: true, cod: true, card: true } }),
    });
    all.orderCreate.mockResolvedValue(orderRow({ paymentMethod: 'card' }));
    const orderUpdate = vi.fn().mockResolvedValue({});
    (all.tx.order as { update: unknown }).update = orderUpdate;

    const created = await service(all).createOrder('baandoi.example.com', {
      ...orderInput,
      paymentMethod: 'card',
    });

    expect(created.payment.redirectUrl).toBe('https://checkout.stripe.com/c/cs_1');
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: {
        provider: 'stripe',
        providerRef: 'cs_1',
        paymentUrl: 'https://checkout.stripe.com/c/cs_1',
      },
    });
    expect(fetchSpy).toHaveBeenCalledOnce();
    delete process.env.STRIPE_SECRET_KEY;
    vi.restoreAllMocks();
  });
});

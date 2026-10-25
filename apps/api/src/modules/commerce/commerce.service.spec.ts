import { describe, expect, it, vi, type Mock } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import type { PublishService } from '../publish/publish.service';
import type { OrderNotifier } from './order-notifier';
import { CommerceService } from './commerce.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const USER_ID = '00000000-0000-4000-8000-000000000001';
const PRODUCT_ID = '3f1a8b0c-1111-4c22-9d33-444455556666';
const MEDIA_ID = '5e2b9c1d-2222-4d33-8e44-555566667777';
const ORDER_ID = '7a3c0d2e-3333-4e44-9f55-666677778888';

const productRow = (overrides: Record<string, unknown> = {}) => ({
  id: PRODUCT_ID,
  siteId: SITE_ID,
  title: 'กาแฟคั่วกลาง',
  slug: 'medium-roast',
  description: 'คั่วกลาง หอมช็อกโกแลต',
  price: 35_000,
  compareAtPrice: 42_000,
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
  id: ORDER_ID,
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
  items: [
    {
      id: 'item-1',
      orderId: ORDER_ID,
      siteId: SITE_ID,
      productId: PRODUCT_ID,
      title: 'กาแฟคั่วกลาง',
      price: 35_000,
      quantity: 1,
      image: null,
    },
  ],
  ...overrides,
});

interface Stubs {
  db: PrismaService;
  tx: Record<string, unknown>;
  auditCreate: Mock;
  productCreate: Mock;
  productUpdate: Mock;
  productUpdateMany: Mock;
  orderUpdate: Mock;
}

const stubs = (
  options: {
    site?: unknown;
    product?: unknown;
    products?: unknown[];
    order?: unknown;
    orderUpdateResult?: unknown;
  } = {},
): Stubs => {
  const auditCreate = vi.fn().mockResolvedValue({});
  const productCreate = vi.fn().mockResolvedValue(productRow());
  const productUpdate = vi.fn().mockResolvedValue(productRow());
  const productUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
  const orderUpdate = vi.fn().mockResolvedValue(orderRow({ status: 'cancelled' }));

  const tx = {
    site: {
      findUnique: vi.fn().mockResolvedValue(
        options.site ?? {
          settings: {},
          name: 'กาแฟบ้านดอย',
          subdomain: 'baandoi',
          domains: [],
        },
      ),
      update: vi.fn().mockResolvedValue({}),
    },
    product: {
      findMany: vi.fn().mockResolvedValue(options.products ?? [productRow()]),
      count: vi.fn().mockResolvedValue(1),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue('product' in options ? options.product : productRow()),
      create: productCreate,
      update: productUpdate,
      updateMany: productUpdateMany,
    },
    order: {
      findMany: vi.fn().mockResolvedValue([
        { ...orderRow({ status: 'cancelled' }), _count: { items: 1 } },
      ]),
      count: vi.fn().mockResolvedValue(1),
      findUnique: vi.fn().mockResolvedValue(options.order ?? orderRow()),
      findUniqueOrThrow: vi.fn().mockResolvedValue(options.orderUpdateResult ?? orderRow({ status: 'cancelled' })),
      update: orderUpdate,
    },
    media: { findMany: vi.fn().mockResolvedValue([mediaRow]) },
    auditLog: { create: auditCreate },
  };

  const db = {
    forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx)),
  } as unknown as PrismaService;

  return { db, tx, auditCreate, productCreate, productUpdate, productUpdateMany, orderUpdate };
};

const service = (all: Stubs, publish?: { enqueueChrome: Mock }): CommerceService =>
  new CommerceService(
    all.db,
    {
      created: vi.fn().mockResolvedValue(undefined),
      statusChanged: vi.fn().mockResolvedValue(undefined),
    } as unknown as OrderNotifier,
    undefined,
    publish as unknown as PublishService,
  );

describe('CommerceService products', () => {
  it('lists products with absolute image urls and a cursor', async () => {
    const all = stubs({ products: [productRow(), productRow({ id: 'second' })] });
    const page = await service(all).listProducts(SITE_ID, { limit: 1 });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.images[0]).toContain('shop/beans-640.webp');
    expect(page.cursor).toBe(PRODUCT_ID);
  });

  it('creates a product and records the price in the audit trail', async () => {
    const all = stubs();
    const created = await service(all).createProduct(
      SITE_ID,
      {
        title: 'กาแฟคั่วกลาง',
        slug: 'medium-roast',
        description: '',
        tagline: '',
        summary: '',
        rating: null,
        ratingCount: 0,
        price: 35_000,
        compareAtPrice: null,
        images: [MEDIA_ID],
        specs: [{ label: 'กำลังไฟ', value: '9.5 วัตต์' }],
        stock: 10,
        weightGrams: 0,
        options: [],
        variants: [],
        category: null,
        status: 'active',
      },
      USER_ID,
    );

    expect(created.price).toBe(35_000);
    expect(all.productCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          specs: [{ label: 'กำลังไฟ', value: '9.5 วัตต์' }],
        }),
      }),
    );
    expect(all.productCreate).toHaveBeenCalledOnce();
    expect(all.auditCreate).toHaveBeenCalledOnce();
  });

  it('rebuilds the product page and the pages that show the catalog', async () => {
    const all = stubs();
    const publish = { enqueueChrome: vi.fn().mockResolvedValue({}) };
    await service(all, publish).createProduct(
      SITE_ID,
      {
        title: 'กาแฟคั่วกลาง',
        slug: 'medium-roast',
        description: '',
        tagline: '',
        summary: '',
        rating: null,
        ratingCount: 0,
        price: 35_000,
        compareAtPrice: null,
        images: [MEDIA_ID],
        specs: [],
        stock: 10,
        weightGrams: 0,
        options: [],
        variants: [],
        category: null,
        status: 'active',
      },
      USER_ID,
    );

    expect(publish.enqueueChrome).toHaveBeenCalledWith(SITE_ID, ['/shop/medium-roast']);
  });

  it('keeps the saved product even when the rebuild cannot be queued', async () => {
    const all = stubs();
    const publish = { enqueueChrome: vi.fn().mockRejectedValue(new Error('queue down')) };

    await expect(
      service(all, publish).archiveProduct(SITE_ID, PRODUCT_ID, USER_ID),
    ).resolves.toBeUndefined();
  });

  it('rejects an image that is not in the site library', async () => {
    const all = stubs();
    (all.tx.media as { findMany: Mock }).findMany.mockResolvedValue([]);

    await expect(
      service(all).createProduct(
        SITE_ID,
        {
          title: 'กาแฟ',
          slug: 'beans',
          description: '',
          tagline: '',
          summary: '',
          rating: null,
          ratingCount: 0,
          price: 1_000,
          compareAtPrice: null,
          images: [MEDIA_ID],
          specs: [],
          stock: null,
          weightGrams: 0,
          options: [],
          variants: [],
          category: null,
          status: 'draft',
        },
        USER_ID,
      ),
    ).rejects.toMatchObject({ code: 'validation_error' });
    expect(all.productCreate).not.toHaveBeenCalled();
  });

  it('keeps the compare-at price above the selling price on update', async () => {
    const all = stubs({ product: productRow({ price: 30_000, compareAtPrice: 40_000 }) });

    await expect(
      service(all).updateProduct(
        SITE_ID,
        PRODUCT_ID,
        { compareAtPrice: 20_000 },
        USER_ID,
      ),
    ).rejects.toMatchObject({ code: 'validation_error' });
    expect(all.productUpdate).not.toHaveBeenCalled();
  });

  it('archives instead of deleting so old orders stay readable', async () => {
    const all = stubs();
    await service(all).archiveProduct(SITE_ID, PRODUCT_ID, USER_ID);

    expect(all.productUpdate).toHaveBeenCalledWith({
      where: { id: PRODUCT_ID },
      data: { status: 'archived' },
    });
  });
});

describe('CommerceService orders', () => {
  it('returns customer and item snapshots in the detail view', async () => {
    const all = stubs();
    const detail = await service(all).getOrder(SITE_ID, ORDER_ID);

    expect(detail.customer.name).toBe('อรุณี ใจดี');
    expect(detail.items[0]?.lineTotal).toBe(35_000);
    expect(detail.itemsCount).toBe(1);
  });

  it('puts stock back when an order is cancelled', async () => {
    const all = stubs();
    const updated = await service(all).updateOrderStatus(
      SITE_ID,
      ORDER_ID,
      { status: 'cancelled' },
      USER_ID,
    );

    expect(updated.status).toBe('cancelled');
    expect(all.productUpdateMany).toHaveBeenCalledWith({
      where: { id: PRODUCT_ID, stock: { not: null } },
      data: { stock: { increment: 1 } },
    });
  });

  it('refuses a status that skips a step', async () => {
    const all = stubs({ order: orderRow({ status: 'completed' }) });

    await expect(
      service(all).updateOrderStatus(SITE_ID, ORDER_ID, { status: 'paid' }, USER_ID),
    ).rejects.toMatchObject({ code: 'conflict' });
    expect(all.orderUpdate).not.toHaveBeenCalled();
  });
});

describe('CommerceService settings', () => {
  it('merges new settings over the defaults and reports the change', async () => {
    const all = stubs({
      site: { settings: { commerce: { promptPayId: '0812345678', shippingFee: 4_000 } } },
    });
    const updated = await service(all).updateSettings(
      SITE_ID,
      { freeShippingThreshold: 80_000 },
      USER_ID,
    );

    expect(updated.promptPayId).toBe('0812345678');
    expect(updated.shippingFee).toBe(4_000);
    expect(updated.freeShippingThreshold).toBe(80_000);
    expect(all.auditCreate).toHaveBeenCalledOnce();
  });
});

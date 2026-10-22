import { describe, expect, it, vi, type Mock } from 'vitest';
import type { OrderNotifier } from './order-notifier';
import type { OrderWebhookNotifier } from './order-webhook';
import type { PrismaService } from '../prisma/prisma.service';
import { CommerceService } from './commerce.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000b2';
const ORDER_ID = '00000000-0000-4000-8000-0000000000b3';
const USER_ID = '00000000-0000-4000-8000-0000000000b4';
const PRODUCT_ID = '00000000-0000-4000-8000-0000000000b5';
const VARIANT_ID = '00000000-0000-4000-8000-0000000000b6';

interface Fixture {
  db: PrismaService;
  order: Record<string, unknown>;
  audit: Mock;
  productIncrement: Mock;
  variantIncrement: Mock;
  notifier: { statusChanged: Mock };
  webhooks: { emit: Mock };
}

const fixture = (overrides: Record<string, unknown> = {}): Fixture => {
  const order: Record<string, unknown> = {
    id: ORDER_ID,
    siteId: SITE_ID,
    number: 'LM-261022-CD34',
    token: 'token-1',
    status: 'paid',
    paymentMethod: 'promptpay',
    customer: { name: 'อรุณี ใจดี', phone: '0891234567', email: 'arunee@example.com' },
    note: '',
    subtotal: 35_000,
    shippingFee: 5_000,
    total: 40_000,
    currency: 'THB',
    trackingNumber: null,
    provider: null,
    providerRef: null,
    paymentUrl: null,
    paidAt: new Date('2026-10-20T05:00:00Z'),
    refundedAmount: 0,
    refundedAt: null,
    refundReason: '',
    refundRef: null,
    sellerTransferId: null,
    sellerTransferAt: null,
    createdAt: new Date('2026-10-20T04:00:00Z'),
    updatedAt: new Date('2026-10-20T05:00:00Z'),
    items: [
      {
        id: 'item-1',
        orderId: ORDER_ID,
        siteId: SITE_ID,
        productId: PRODUCT_ID,
        variantId: VARIANT_ID,
        variantLabel: 'M',
        title: 'กาแฟคั่วกลาง',
        price: 35_000,
        quantity: 1,
        image: null,
      },
    ],
    slips: [],
    ...overrides,
  };

  const audit = vi.fn().mockResolvedValue({});
  const productIncrement = vi.fn().mockResolvedValue({ count: 1 });
  const variantIncrement = vi.fn().mockResolvedValue({ count: 1 });

  const tx = {
    order: {
      findUnique: async () => order,
      findUniqueOrThrow: async () => order,
      update: async ({ data }: { data: Record<string, unknown> }) => {
        const amount = data.refundedAmount as { increment?: number } | undefined;
        if (amount?.increment) {
          order.refundedAmount = (order.refundedAmount as number) + amount.increment;
        }
        for (const key of ['status', 'refundedAt', 'refundReason', 'refundRef']) {
          if (key in data) order[key] = data[key];
        }
        return order;
      },
    },
    product: { updateMany: productIncrement },
    productVariant: { updateMany: variantIncrement },
    site: {
      findUnique: async () => ({ name: 'กาแฟบ้านดอย', subdomain: 'baandoi', settings: {}, domains: [] }),
    },
    auditLog: { create: audit },
  };

  const db = {
    forSite: async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx),
  } as unknown as PrismaService;

  const notifier = { statusChanged: vi.fn().mockResolvedValue(undefined) };
  const webhooks = { emit: vi.fn().mockResolvedValue(undefined) };

  return { db, order, audit, productIncrement, variantIncrement, notifier, webhooks };
};

const service = (all: Fixture): CommerceService =>
  new CommerceService(
    all.db,
    all.notifier as unknown as OrderNotifier,
    all.webhooks as unknown as OrderWebhookNotifier,
  );

describe('CommerceService.refundOrder', () => {
  it('returns the whole amount, closes the order and keeps the money trail', async () => {
    const all = fixture();
    const detail = await service(all).refundOrder(
      SITE_ID,
      ORDER_ID,
      { reason: 'สินค้าหมด', restock: true },
      USER_ID,
    );

    expect(detail.status).toBe('refunded');
    expect(detail.refundedAmount).toBe(40_000);
    expect(detail.refundedAt).not.toBeNull();
    expect(detail.refundReason).toBe('สินค้าหมด');
    expect(all.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'order.refund' }),
      }),
    );
    expect(all.notifier.statusChanged).toHaveBeenCalledWith(expect.anything(), 'refunded');
    expect(all.webhooks.emit).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'order.refunded',
      expect.anything(),
    );
  });

  it('refuses an order that never received money', async () => {
    const all = fixture({ status: 'pending', paidAt: null });

    await expect(
      service(all).refundOrder(SITE_ID, ORDER_ID, { reason: '', restock: true }, USER_ID),
    ).rejects.toMatchObject({ code: 'conflict' });
    expect(all.audit).not.toHaveBeenCalled();
  });

  it('refuses to return more than the order is worth', async () => {
    const all = fixture();

    await expect(
      service(all).refundOrder(
        SITE_ID,
        ORDER_ID,
        { amount: 50_000, reason: '', restock: true },
        USER_ID,
      ),
    ).rejects.toMatchObject({ code: 'validation_error' });
  });

  it('sends the items back to stock when asked, and leaves stock alone otherwise', async () => {
    const restocked = fixture();
    await service(restocked).refundOrder(SITE_ID, ORDER_ID, { reason: '', restock: true }, USER_ID);
    expect(restocked.variantIncrement).toHaveBeenCalledTimes(1);
    expect(restocked.productIncrement).toHaveBeenCalledTimes(1);

    const kept = fixture();
    await service(kept).refundOrder(SITE_ID, ORDER_ID, { reason: '', restock: false }, USER_ID);
    expect(kept.variantIncrement).not.toHaveBeenCalled();
    expect(kept.productIncrement).not.toHaveBeenCalled();
  });

  it('keeps the refund reason short and empty when nothing was said', async () => {
    const all = fixture();
    const detail = await service(all).refundOrder(
      SITE_ID,
      ORDER_ID,
      { reason: '', restock: false },
      USER_ID,
    );

    expect(detail.refundReason).toBe('');
  });
});

import { describe, expect, it, vi } from 'vitest';
import type { Mailer } from '../../common/mailer';
import { OrderNotifier, type OrderNoticeContext } from './order-notifier';

const context = (overrides: Partial<OrderNoticeContext> = {}): OrderNoticeContext => {
  const order = {
    id: 'order-1',
    siteId: 'site-1',
    number: 'LM-261022-AB12',
    token: 'token-1',
    status: 'pending',
    paymentMethod: 'promptpay',
    customer: {
      name: 'อรุณี ใจดี',
      phone: '0891234567',
      email: 'arunee@example.com',
      address: '128 นิมมาน',
      subdistrict: 'สุเทพ',
      district: 'เมือง',
      province: 'เชียงใหม่',
      postcode: '50200',
    },
    note: 'ฝากส่งก่อนวันศุกร์',
    subtotal: 35_000,
    shippingFee: 5_000,
    total: 40_000,
    currency: 'THB',
    trackingNumber: null,
    provider: null,
    providerRef: null,
    paymentUrl: null,
    paidAt: null,
    refundedAmount: 0,
    refundedAt: null,
    refundReason: '',
    refundRef: null,
    sellerTransferId: null,
    sellerTransferAt: null,
    createdAt: new Date('2026-10-22T09:00:00Z'),
    updatedAt: new Date('2026-10-22T09:00:00Z'),
    items: [
      {
        id: 'item-1',
        orderId: 'order-1',
        siteId: 'site-1',
        productId: null,
        variantId: null,
        variantLabel: null,
        title: 'กาแฟคั่วกลาง',
        price: 35_000,
        quantity: 1,
        image: null,
      },
    ],
  };

  return {
    siteName: 'กาแฟบ้านดอย',
    ownerEmail: 'owner@lumio.app',
    publicUrl: 'https://baandoi.lumio.app',
    settings: {
      promptPayId: '0812345678',
      shippingFee: 5_000,
      freeShippingThreshold: 50_000,
      shippingPerKgFee: 0,
      shippingZones: [],
      payments: { promptpay: true, cod: true, card: false, bbl: false },
      stripeAccountId: null,
      stripeChargesEnabled: false,
      stripePayoutsEnabled: false,
      platformFeePercent: 0,
    },
    order,
    ...overrides,
  };
};

const mailer = () => {
  const send = vi.fn().mockResolvedValue(true);
  return { send, mailer: { send } as unknown as Mailer };
};

describe('OrderNotifier', () => {
  it('emails both the buyer and the owner with the PromptPay details', async () => {
    const { send, mailer: mail } = mailer();
    await new OrderNotifier(mail).created(context());

    expect(send).toHaveBeenCalledTimes(2);
    const buyer = send.mock.calls.find((call) => call[0].to === 'arunee@example.com')?.[0] as {
      text: string;
    };
    expect(buyer.text).toContain('0812345678');
    expect(buyer.text).toContain('LM-261022-AB12');
    expect(buyer.text).toContain('https://baandoi.lumio.app/order/token-1');

    const owner = send.mock.calls.find((call) => call[0].to === 'owner@lumio.app')?.[0] as {
      subject: string;
    };
    expect(owner.subject).toContain('คำสั่งซื้อใหม่');
  });

  it('skips the buyer email when the order has no address', async () => {
    const { send, mailer: mail } = mailer();
    const base = context();
    await new OrderNotifier(mail).created({
      ...base,
      order: {
        ...base.order,
        customer: { ...(base.order.customer as Record<string, unknown>), email: null },
      },
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0].to).toBe('owner@lumio.app');
  });

  it('tells the buyer about tracking when the order ships', async () => {
    const { send, mailer: mail } = mailer();
    const base = context();
    await new OrderNotifier(mail).statusChanged(
      {
        ...base,
        order: { ...base.order, status: 'shipped', trackingNumber: 'KER123' },
      },
      'shipped',
    );

    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0]?.[0].text).toContain('KER123');
    expect(send.mock.calls[0]?.[0].subject).toContain('จัดส่งแล้ว');
  });

  it('attaches the receipt PDF once the order is paid', async () => {
    const { send, mailer: mail } = mailer();
    const base = context();
    await new OrderNotifier(mail).statusChanged(
      {
        ...base,
        order: { ...base.order, status: 'paid', paidAt: new Date('2026-10-22T10:00:00Z') },
      },
      'paid',
    );

    const message = send.mock.calls[0]?.[0] as {
      attachments?: { filename: string; content: Buffer; contentType: string }[];
    };
    expect(message.attachments?.[0]?.filename).toBe('receipt-LM-261022-AB12.pdf');
    expect(message.attachments?.[0]?.contentType).toBe('application/pdf');
    expect(message.attachments?.[0]?.content.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('tells the buyer how much was refunded and why', async () => {
    const { send, mailer: mail } = mailer();
    const base = context();
    await new OrderNotifier(mail).statusChanged(
      {
        ...base,
        order: {
          ...base.order,
          status: 'refunded',
          refundedAmount: 40_000,
          refundReason: 'สินค้าหมด',
        },
      },
      'refunded',
    );

    const text = send.mock.calls[0]?.[0].text as string;
    expect(text).toContain('คืนเงิน 400.00 บาท');
    expect(text).toContain('สินค้าหมด');
  });
});

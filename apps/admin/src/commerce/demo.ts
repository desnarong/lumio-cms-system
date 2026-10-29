import {
  commerceSettingsSchema,
  type BankConnection,
  type UpdateBankSettingsInput,
  type CommerceSettings,
  type ConnectLink,
  type ConnectStatus,
  type CreateProductInput,
  type OrderDetail,
  type OrderList,
  type OrderListQuery,
  type OrderWebhookView,
  type ProductListQuery,
  type ProductSummary,
  type Promotion,
  type PromotionInput,
  type RefundOrderInput,
  type ReviewSlipInput,
  type UpdateCommerceSettingsInput,
  type UpdateOrderStatusInput,
  type UpdateOrderWebhookInput,
  type UpdateProductInput,
} from '@lumio/shared';
import { ApiError } from '../api-error.js';
import type { CommerceApi } from './api.js';

const swatch = (top: string, bottom: string, label: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400" role="img" aria-label="${label}">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/>` +
      `</linearGradient></defs><rect width="640" height="400" fill="url(#g)"/>` +
      `<text x="32" y="356" fill="#ffffff" font-family="system-ui" font-size="28">${label}</text></svg>`,
  )}`;

const product = (
  id: string,
  title: string,
  slug: string,
  price: number,
  stock: number | null,
  category: string,
  status: ProductSummary['status'],
  colours: [string, string],
): ProductSummary => ({
  id,
  title,
  slug,
  description: 'ตัวอย่างสินค้าสำหรับโหมดทดลอง แก้ไขได้ทุกช่อง',
  tagline: 'ตัวอย่างจุดขายสั้น ๆ ที่ขึ้นใต้ชื่อสินค้า',
  summary: 'คำแนะนำสั้น ๆ ก่อนถึงปุ่มซื้อ',
  rating: 4.5,
  ratingCount: 12,
  price,
  compareAtPrice: null,
  currency: 'THB',
  images: [swatch(colours[0], colours[1], title)],
  imageIds: [id],
  specs: [],
  stock,
  weightGrams: 0,
  options: [],
  variants: [],
  category,
  status,
  createdAt: '2026-10-18T09:00:00.000Z',
  updatedAt: '2026-10-18T09:00:00.000Z',
});

const demoProducts = (): ProductSummary[] => [
  product(
    'demo-product-beans',
    'กาแฟคั่วกลางดอยช้าง 250 กรัม',
    'doichang-medium-roast-250g',
    35_000,
    24,
    'เมล็ดกาแฟ',
    'active',
    ['#c9793c', '#5b2f16'],
  ),
  product(
    'demo-product-drip',
    'ชุดดริปกาแฟ 10 ซอง',
    'drip-coffee-10-packs',
    25_000,
    40,
    'ชุดพร้อมชง',
    'active',
    ['#8d5a3b', '#2f2118'],
  ),
  product(
    'demo-product-mug',
    'แก้วเซรามิกบ้านดอย',
    'baandoi-ceramic-mug',
    29_000,
    null,
    'ของที่ระลึก',
    'active',
    ['#3f7d5a', '#14342a'],
  ),
];

const customer = {
  name: 'อรุณี ใจดี',
  phone: '0891234567',
  email: 'arunee@example.com',
  address: '128 ถนนนิมมานเหมินท์',
  subdistrict: 'สุเทพ',
  district: 'เมือง',
  province: 'เชียงใหม่',
  postcode: '50200',
};

const demoOrder = (): OrderDetail => ({
  id: 'demo-order-1',
  number: 'LM-261021-AB12',
  status: 'pending',
  paymentMethod: 'promptpay',
  customerName: customer.name,
  customerPhone: customer.phone,
  customer,
  note: 'ฝากส่งก่อนวันศุกร์',
  itemsCount: 2,
  items: [
    {
      productId: 'demo-product-beans',
      variantId: null,
      variantLabel: null,
      title: 'กาแฟคั่วกลางดอยช้าง 250 กรัม',
      price: 35_000,
      quantity: 1,
      image: swatch('#c9793c', '#5b2f16', 'กาแฟ'),
      lineTotal: 35_000,
    },
    {
      productId: 'demo-product-drip',
      variantId: null,
      variantLabel: null,
      title: 'ชุดดริปกาแฟ 10 ซอง',
      price: 25_000,
      quantity: 1,
      image: swatch('#8d5a3b', '#2f2118', 'ดริป'),
      lineTotal: 25_000,
    },
  ],
  subtotal: 60_000,
  shippingFee: 0,
  total: 60_000,
  currency: 'THB',
  trackingNumber: null,
  paymentUrl: null,
  slip: null,
  createdAt: '2026-10-21T08:30:00.000Z',
  paidAt: null,
  refundedAmount: 0,
  refundedAt: null,
  refundReason: '',
});

const demoPaidOrder = (): OrderDetail => ({
  ...demoOrder(),
  id: 'demo-order-2',
  number: 'LM-261020-CD34',
  status: 'paid',
  paymentMethod: 'cod',
  total: 40_000,
  subtotal: 35_000,
  shippingFee: 5_000,
  createdAt: '2026-10-20T04:15:00.000Z',
  paidAt: '2026-10-20T05:00:00.000Z',
});

const matchesProduct = (item: ProductSummary, query: ProductListQuery): boolean => {
  if (query.status && item.status !== query.status) return false;
  const term = query.q?.trim().toLowerCase();
  return term
    ? item.title.toLowerCase().includes(term) || item.slug.toLowerCase().includes(term)
    : true;
};

const matchesOrder = (item: OrderDetail, query: OrderListQuery): boolean => {
  if (query.status && item.status !== query.status) return false;
  const term = query.q?.trim().toLowerCase();
  return term ? item.number.toLowerCase().includes(term) : true;
};

const summarize = (order: OrderDetail): OrderList['items'][number] => ({
  id: order.id,
  number: order.number,
  status: order.status,
  paymentMethod: order.paymentMethod,
  customerName: order.customerName,
  customerPhone: order.customerPhone,
  itemsCount: order.itemsCount,
  subtotal: order.subtotal,
  shippingFee: order.shippingFee,
  total: order.total,
  currency: order.currency,
  trackingNumber: order.trackingNumber,
  paymentUrl: order.paymentUrl,
  createdAt: order.createdAt,
  paidAt: order.paidAt,
  refundedAmount: order.refundedAmount,
  refundedAt: order.refundedAt,
});

let bankAccountNumber: string | null = null;

let bank: BankConnection = {
  provider: 'bbl',
  connected: false,
  mode: 'not_configured',
  accountNumber: null,
  accountName: '',
  autoVerifySlips: true,
  clientId: '',
  hasClientSecret: false,
  hasWebhookSecret: false,
  apiKeySet: false,
  baseUrl: '',
  sandbox: false,
  connectedAt: null,
  lastCheckedAt: null,
  message: 'ยังไม่ได้เชื่อมต่อธนาคารกรุงเทพ',
};

const maskedAccount = (value: string | null): string | null =>
  value && value.length >= 10 ? `${value.slice(0, 3)}xxxx${value.slice(-3)}` : value;

/** In-memory shop so every screen works before an API is configured. */
export const createDemoCommerceApi = (): CommerceApi => {
  let products = demoProducts();
  let orders = [demoOrder(), demoPaidOrder()];
  let promotions: Promotion[] = [
    {
      id: 'demo-promo-bundle',
      title: 'ซื้อ 10 แถม 1',
      description: 'สำหรับหลอด LED ขั้ว E27 ทุกขนาด',
      kind: 'bundle',
      badge: '',
      imageUrl: null,
      imageAlt: '',
      buyQty: 10,
      getQty: 1,
      startsAt: null,
      endsAt: null,
      active: true,
      sort: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo-promo-shipping',
      title: 'ส่งฟรีทั่วประเทศ',
      description: 'เมื่อสั่งซื้อครบ 5,000 บาท',
      kind: 'shipping',
      badge: '',
      imageUrl: null,
      imageAlt: '',
      buyQty: null,
      getQty: null,
      startsAt: null,
      endsAt: null,
      active: true,
      sort: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  let promotionCounter = promotions.length;
  let settings: CommerceSettings = commerceSettingsSchema.parse({
    promptPayId: '0812345678',
    shippingFee: 5_000,
    freeShippingThreshold: 50_000,
  });
  let webhook: OrderWebhookView = {
    url: '',
    events: ['order.created', 'order.paid', 'order.status', 'order.refunded'],
    secretSet: false,
    enabled: false,
  };

  const findProduct = (productId: string): ProductSummary => {
    const found = products.find((item) => item.id === productId);
    if (!found) throw new ApiError('not_found', 'ไม่พบสินค้านี้', 404);
    return found;
  };

  return {
    getSettings: async () => settings,
    updateSettings: async (input: UpdateCommerceSettingsInput) => {
      settings = commerceSettingsSchema.parse({ ...settings, ...input });
      return settings;
    },

    listProducts: async (query: ProductListQuery = { limit: 100 }) => {
      const items = products.filter((item) => matchesProduct(item, query));
      return { items, cursor: null, total: items.length };
    },
    createProduct: async (input: CreateProductInput) => {
      const created: ProductSummary = {
        id: `demo-product-${products.length + 1}`,
        title: input.title,
        slug: input.slug,
        description: input.description,
        tagline: input.tagline,
        summary: input.summary,
        rating: input.rating,
        ratingCount: input.ratingCount,
        price: input.price,
        compareAtPrice: input.compareAtPrice,
        currency: 'THB',
        images: [],
        imageIds: input.images,
        specs: input.specs,
        stock: input.stock,
        weightGrams: input.weightGrams,
        options: input.options,
        variants: input.variants.map((variant, index) => ({
          id: `demo-variant-${index}`,
          options: variant.options,
          signature: Object.values(variant.options).join('|'),
          label: Object.values(variant.options).join(' · '),
          sku: variant.sku,
          price: variant.price,
          compareAtPrice: variant.compareAtPrice,
          stock: variant.stock,
        })),
        category: input.category,
        status: input.status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      products = [created, ...products];
      return created;
    },
    updateProduct: async (productId: string, input: UpdateProductInput) => {
      const current = findProduct(productId);
      const { variants, ...rest } = input;
      const updated: ProductSummary = {
        ...current,
        ...rest,
        ...(variants
          ? {
              variants: variants.map((variant, index) => ({
                id: variant.id ?? `demo-variant-${index}`,
                options: variant.options,
                signature: Object.values(variant.options).join('|'),
                label: Object.values(variant.options).join(' · '),
                sku: variant.sku,
                price: variant.price,
                compareAtPrice: variant.compareAtPrice,
                stock: variant.stock,
              })),
            }
          : {}),
        updatedAt: new Date().toISOString(),
      };
      products = products.map((item) => (item.id === productId ? updated : item));
      return updated;
    },
    listPromotions: async () => promotions,
    createPromotion: async (input: PromotionInput) => {
      promotionCounter += 1;
      const now = new Date().toISOString();
      const created: Promotion = {
        ...input,
        description: input.description ?? '',
        badge: input.badge ?? '',
        imageUrl: input.imageUrl ?? null,
        imageAlt: input.imageAlt ?? '',
        buyQty: input.buyQty ?? null,
        getQty: input.getQty ?? null,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
        id: `demo-promo-${promotionCounter}`,
        createdAt: now,
        updatedAt: now,
      };
      promotions = [...promotions, created];
      return created;
    },
    updatePromotion: async (promotionId: string, input: Partial<PromotionInput>) => {
      const found = promotions.find((item) => item.id === promotionId);
      if (!found) throw new ApiError('not_found', 'ไม่พบโปรโมชั่นนี้', 404);
      const updated: Promotion = {
        ...found,
        ...input,
        imageUrl: input.imageUrl === undefined ? found.imageUrl : input.imageUrl,
        imageAlt: input.imageAlt === undefined ? found.imageAlt : input.imageAlt,
        buyQty: input.buyQty === undefined ? found.buyQty : input.buyQty,
        getQty: input.getQty === undefined ? found.getQty : input.getQty,
        startsAt: input.startsAt === undefined ? found.startsAt : input.startsAt,
        endsAt: input.endsAt === undefined ? found.endsAt : input.endsAt,
        updatedAt: new Date().toISOString(),
      };
      promotions = promotions.map((item) => (item.id === promotionId ? updated : item));
      return updated;
    },
    removePromotion: async (promotionId: string) => {
      promotions = promotions.filter((item) => item.id !== promotionId);
    },

    archiveProduct: async (productId: string) => {
      findProduct(productId);
      products = products.map((item) =>
        item.id === productId ? { ...item, status: 'archived' } : item,
      );
    },

    listOrders: async (query: OrderListQuery = { limit: 100 }) => {
      const items = orders.filter((item) => matchesOrder(item, query)).map(summarize);
      return { items, cursor: null, total: items.length };
    },
    getOrder: async (orderId: string) => {
      const found = orders.find((item) => item.id === orderId);
      if (!found) throw new ApiError('not_found', 'ไม่พบคำสั่งซื้อนี้', 404);
      return found;
    },
    getConnectStatus: async (): Promise<ConnectStatus> => ({
      accountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
    }),
    startConnectOnboarding: async (): Promise<ConnectLink> => ({
      url: '#stripe-connect',
      accountId: 'acct_demo',
    }),
    refreshConnect: async (): Promise<ConnectStatus> => ({
      accountId: 'acct_demo',
      chargesEnabled: true,
      payoutsEnabled: true,
    }),
    getBankConnection: async () => bank,
    updateBankSettings: async (input: UpdateBankSettingsInput) => {
      bankAccountNumber =
        input.accountNumber === undefined ? bankAccountNumber : input.accountNumber;
      const clientId = input.clientId ?? bank.clientId;
      const hasClientSecret = input.clientSecret ? true : bank.hasClientSecret;
      const hasWebhookSecret = input.webhookSecret ? true : bank.hasWebhookSecret;
      const sandbox = input.sandbox ?? bank.sandbox;
      const mode: BankConnection['mode'] =
        clientId !== '' && hasClientSecret ? (sandbox ? 'sandbox' : 'live') : 'not_configured';
      const connected = clientId !== '' && hasClientSecret && hasWebhookSecret;
      bank = {
        provider: 'bbl',
        connected,
        mode,
        accountNumber: maskedAccount(bankAccountNumber),
        accountName: input.accountName ?? bank.accountName,
        autoVerifySlips: input.autoVerifySlips ?? bank.autoVerifySlips,
        clientId,
        hasClientSecret,
        hasWebhookSecret,
        apiKeySet: input.apiKey ? true : bank.apiKeySet,
        baseUrl: input.baseUrl ?? bank.baseUrl,
        sandbox,
        connectedAt: connected ? (bank.connectedAt ?? new Date().toISOString()) : null,
        lastCheckedAt: null,
        message: connected
          ? 'เชื่อมต่อ Payment Gateway ของธนาคารกรุงเทพแล้ว (โหมดทดลอง)'
          : 'ยังไม่ได้เชื่อมต่อธนาคารกรุงเทพ',
      };
      return bank;
    },
    testBankConnection: async () => {
      if (bank.clientId === '' || !bank.hasClientSecret || !bank.hasWebhookSecret) {
        throw new ApiError('conflict', 'กรอก Client ID และ Client Secret ก่อนทดสอบ', 409);
      }
      bank = { ...bank, lastCheckedAt: new Date().toISOString() };
      return bank;
    },
    getWebhook: async () => webhook,
    updateWebhook: async (input: UpdateOrderWebhookInput) => {
      const secretSet = input.secret ? input.secret.trim().length >= 16 : webhook.secretSet;
      webhook = {
        url: input.url,
        events: input.events,
        secretSet,
        enabled: input.url.length > 0 && secretSet,
      };
      return webhook;
    },
    testWebhook: async () =>
      webhook.url.length === 0
        ? { delivered: false, status: null, error: 'ยังไม่ได้ตั้งค่าที่อยู่ webhook' }
        : { delivered: true, status: 200, error: null },
    reviewSlip: async (orderId: string, input: ReviewSlipInput) => {
      const current = await (async () => {
        const found = orders.find((item) => item.id === orderId);
        if (!found) throw new ApiError('not_found', 'ไม่พบคำสั่งซื้อนี้', 404);
        return found;
      })();
      const slip = current.slip
        ? { ...current.slip, status: input.status, note: input.note }
        : {
            id: 'demo-slip',
            status: input.status,
            amount: current.total,
            reference: 'DEMO-REF-1',
            imageUrl: '',
            note: input.note,
            createdAt: new Date().toISOString(),
          };
      const updated: OrderDetail = {
        ...current,
        slip,
        status:
          input.status === 'verified' && current.status === 'pending' ? 'paid' : current.status,
        paidAt:
          input.status === 'verified' && !current.paidAt
            ? new Date().toISOString()
            : current.paidAt,
      };
      orders = orders.map((item) => (item.id === orderId ? updated : item));
      return updated;
    },
    refundOrder: async (orderId: string, input: RefundOrderInput) => {
      const current = orders.find((item) => item.id === orderId);
      if (!current) throw new ApiError('not_found', 'ไม่พบคำสั่งซื้อนี้', 404);
      const remaining = current.total - current.refundedAmount;
      const amount = input.amount ?? remaining;
      if (amount > remaining) {
        throw new ApiError('validation_error', 'ยอดคืนเงินมากกว่ายอดที่ยังไม่ได้คืน', 400);
      }
      const updated: OrderDetail = {
        ...current,
        status: 'refunded',
        refundedAmount: current.refundedAmount + amount,
        refundedAt: new Date().toISOString(),
        refundReason: input.reason,
      };
      orders = orders.map((item) => (item.id === orderId ? updated : item));
      return updated;
    },
    updateOrderStatus: async (orderId: string, input: UpdateOrderStatusInput) => {
      const current = await (async () => {
        const found = orders.find((item) => item.id === orderId);
        if (!found) throw new ApiError('not_found', 'ไม่พบคำสั่งซื้อนี้', 404);
        return found;
      })();
      const updated: OrderDetail = {
        ...current,
        status: input.status,
        trackingNumber:
          input.trackingNumber === undefined ? current.trackingNumber : input.trackingNumber,
        paidAt:
          input.status === 'paid' && !current.paidAt ? new Date().toISOString() : current.paidAt,
      };
      orders = orders.map((item) => (item.id === orderId ? updated : item));
      return updated;
    },
  };
};

import { z } from 'zod';
import { slugSchema } from './content.js';
import { paginationQuerySchema } from './site.js';
import { publicGlobalBlocksSchema, publicMenusSchema, publicSiteSchema } from './public.js';

/**
 * Shop data for the e-commerce phase (docs/design/03-scope.md 3.3,
 * docs/design/11-data-model.md 11.4). Money is always an integer number of
 * satang, so a price never picks up floating point noise on its way to the
 * database or back to the browser.
 */

export const PRODUCT_STATUSES = ['draft', 'active', 'archived'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const ORDER_STATUSES = [
  'pending',
  'paid',
  'shipped',
  'completed',
  'cancelled',
  'refunded',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const SHOP_PAYMENT_METHODS = ['promptpay', 'cod', 'card', 'bbl'] as const;
export type ShopPaymentMethod = (typeof SHOP_PAYMENT_METHODS)[number];

export const CURRENCY = 'THB';

export const MAX_PRODUCT_IMAGES = 8;
export const MAX_CART_ITEMS = 50;
export const MAX_CART_QUANTITY = 99;
export const MAX_ORDER_NOTE = 500;
export const MAX_PRODUCT_OPTIONS = 3;
export const MAX_OPTION_VALUES = 20;
export const MAX_PRODUCT_VARIANTS = 60;
export const MAX_SLIP_BYTES = 4 * 1024 * 1024;

export const PAYMENT_SLIP_STATUSES = ['pending_review', 'verified', 'rejected'] as const;
export type PaymentSlipStatus = (typeof PAYMENT_SLIP_STATUSES)[number];

export const isPaymentSlipStatus = (value: unknown): value is PaymentSlipStatus =>
  typeof value === 'string' && (PAYMENT_SLIP_STATUSES as readonly string[]).includes(value);

/** Cart cookie, kept small because every request carries it. */
export const CART_COOKIE = 'lumio_cart';
export const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export const isProductStatus = (value: unknown): value is ProductStatus =>
  typeof value === 'string' && (PRODUCT_STATUSES as readonly string[]).includes(value);

export const isOrderStatus = (value: unknown): value is OrderStatus =>
  typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value);

export const isShopPaymentMethod = (value: unknown): value is ShopPaymentMethod =>
  typeof value === 'string' && (SHOP_PAYMENT_METHODS as readonly string[]).includes(value);

export const formatBaht = (satang: number): string => {
  const sign = satang < 0 ? '-' : '';
  const absolute = Math.abs(Math.trunc(satang));
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, '0');
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${grouped}.${fraction}`;
};

/** Baht input from a form ("1,290.50") to satang; `null` when it is not a price. */
export const parseBaht = (input: string): number | null => {
  const clean = input.replace(/[,\s฿]/g, '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(clean)) return null;
  const [whole, fraction = ''] = clean.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
};

/* ------------------------------------------------------------------ settings */

export const DEFAULT_SHIPPING_FEE = 5_000;
export const DEFAULT_FREE_SHIPPING_THRESHOLD = 50_000;

export const isPromptPayId = (value: string): boolean =>
  /^0\d{9}$/.test(value) || /^\d{13}$/.test(value);

/** A delivery area: provinces listed here use this fee instead of the base fee. */
export const shippingZoneSchema = z.object({
  label: z.string().trim().max(60).default(''),
  provinces: z.array(z.string().trim().min(1).max(120)).max(80).default([]),
  fee: z.number().int().min(0).max(1_000_000),
});
export type ShippingZone = z.infer<typeof shippingZoneSchema>;

export const commerceSettingsSchema = z.object({
  /** Phone number or national ID PromptPay receives the money. */
  promptPayId: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || isPromptPayId(value),
      'พร้อมเพย์ต้องเป็นเบอร์โทร 10 หลัก หรือเลขบัตร 13 หลัก',
    )
    .nullable()
    .default(null),
  shippingFee: z.number().int().min(0).max(1_000_000).default(DEFAULT_SHIPPING_FEE),
  freeShippingThreshold: z
    .number()
    .int()
    .min(0)
    .max(10_000_000)
    .nullable()
    .default(DEFAULT_FREE_SHIPPING_THRESHOLD),
  /** Extra delivery charge per started kilogram; 0 turns weight pricing off. */
  shippingPerKgFee: z.number().int().min(0).max(1_000_000).default(0),
  shippingZones: z.array(shippingZoneSchema).max(20).default([]),
  payments: z
    .object({
      promptpay: z.boolean().default(true),
      cod: z.boolean().default(true),
      /** Card checkout through the platform Stripe account. */
      card: z.boolean().default(false),
      /** Hosted Bangkok Bank payment page (card, QR) for this shop. */
      bbl: z.boolean().default(false),
    })
    .default({ promptpay: true, cod: true, card: false, bbl: false }),
  /** Stripe Connect account that receives the seller's share of card payments. */
  stripeAccountId: z.string().trim().max(120).nullable().default(null),
  stripeChargesEnabled: z.boolean().default(false),
  stripePayoutsEnabled: z.boolean().default(false),
  /** Platform commission kept before transferring the rest to the seller. */
  platformFeePercent: z.number().min(0).max(50).default(0),
});
export type CommerceSettings = z.infer<typeof commerceSettingsSchema>;

/** Connect fields are written by the Stripe flow only, never by a settings form. */
export const updateCommerceSettingsInputSchema = commerceSettingsSchema
  .omit({
    stripeAccountId: true,
    stripeChargesEnabled: true,
    stripePayoutsEnabled: true,
  })
  .partial();
export type UpdateCommerceSettingsInput = z.infer<typeof updateCommerceSettingsInputSchema>;

export const connectStatusSchema = z.object({
  accountId: z.string().nullable(),
  chargesEnabled: z.boolean(),
  payoutsEnabled: z.boolean(),
});
export type ConnectStatus = z.infer<typeof connectStatusSchema>;

export const connectLinkSchema = z.object({
  url: z.string().url(),
  accountId: z.string(),
});
export type ConnectLink = z.infer<typeof connectLinkSchema>;

/** Stored settings merged over the defaults, so a new field is never undefined. */
export const readCommerceSettings = (value: unknown): CommerceSettings => {
  const parsed = commerceSettingsSchema.safeParse(
    value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {},
  );
  return parsed.success ? parsed.data : commerceSettingsSchema.parse({});
};

/* ------------------------------------------------------------------ webhooks */

/**
 * Shop owners can mirror every order and payment into their own system (POS,
 * accounting, LINE bot) through a signed webhook they configure in the admin.
 * The payload is a stable, documented shape so the receiving side never has to
 * scrape the database.
 */
export const ORDER_WEBHOOK_EVENTS = [
  'order.created',
  'order.paid',
  'order.status',
  'order.refunded',
] as const;
export type OrderWebhookEvent = (typeof ORDER_WEBHOOK_EVENTS)[number];

/** Only used by the "send a test event" button; never subscribed automatically. */
export const ORDER_WEBHOOK_TEST_EVENT = 'webhook.test';
export type OrderWebhookDeliveryEvent = OrderWebhookEvent | typeof ORDER_WEBHOOK_TEST_EVENT;

export const isOrderWebhookEvent = (value: unknown): value is OrderWebhookEvent =>
  typeof value === 'string' && (ORDER_WEBHOOK_EVENTS as readonly string[]).includes(value);

/** Receivers must be reachable over https; the API refuses private hosts. */
export const orderWebhookUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => value.length === 0 || /^https:\/\/[^\s]+$/i.test(value),
    'ที่อยู่ webhook ต้องขึ้นต้นด้วย https://',
  );

/** Stored settings: the secret is an AES-256-GCM envelope written by the API. */
export const orderWebhookSettingsSchema = z.object({
  url: orderWebhookUrlSchema.default(''),
  events: z
    .array(z.enum(ORDER_WEBHOOK_EVENTS))
    .max(ORDER_WEBHOOK_EVENTS.length)
    .default([...ORDER_WEBHOOK_EVENTS]),
  secret: z.string().max(4096).default(''),
});
export type OrderWebhookSettings = z.infer<typeof orderWebhookSettingsSchema>;

export const readOrderWebhookSettings = (value: unknown): OrderWebhookSettings => {
  const parsed = orderWebhookSettingsSchema.safeParse(
    value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {},
  );
  return parsed.success ? parsed.data : orderWebhookSettingsSchema.parse({});
};

/**
 * What the admin form sends: the signing secret is plaintext on the way in and
 * empty means "keep the current one". It is never returned by the API.
 */
export const updateOrderWebhookInputSchema = z.object({
  url: orderWebhookUrlSchema.default(''),
  events: z
    .array(z.enum(ORDER_WEBHOOK_EVENTS))
    .max(ORDER_WEBHOOK_EVENTS.length)
    .default([...ORDER_WEBHOOK_EVENTS]),
  secret: z
    .string()
    .max(200)
    .refine(
      (value) => value.length === 0 || value.trim().length >= 16,
      'ความลับสำหรับลงชื่อ (secret) ต้องยาวอย่างน้อย 16 ตัวอักษร',
    )
    .optional(),
});
export type UpdateOrderWebhookInput = z.infer<typeof updateOrderWebhookInputSchema>;

export const orderWebhookViewSchema = z.object({
  url: z.string(),
  events: z.array(z.enum(ORDER_WEBHOOK_EVENTS)),
  /** True when a secret is stored; the value itself is write-only. */
  secretSet: z.boolean(),
  /** True when the site has a complete configuration the API can deliver to. */
  enabled: z.boolean(),
});
export type OrderWebhookView = z.infer<typeof orderWebhookViewSchema>;

const webhookMoneySchema = z.number().int().min(0);

export const orderWebhookPayloadSchema = z.object({
  event: z.enum([...ORDER_WEBHOOK_EVENTS, ORDER_WEBHOOK_TEST_EVENT]),
  /** ISO timestamp of the delivery attempt. */
  sentAt: z.string(),
  site: z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
  }),
  order: z.object({
    number: z.string(),
    status: z.enum(ORDER_STATUSES),
    paymentMethod: z.enum(SHOP_PAYMENT_METHODS),
    currency: z.string(),
    subtotal: webhookMoneySchema,
    shippingFee: webhookMoneySchema,
    total: webhookMoneySchema,
    customer: z.record(z.unknown()),
    items: z.array(
      z.object({
        title: z.string(),
        variantLabel: z.string().nullable(),
        quantity: z.number().int().positive(),
        unitPrice: webhookMoneySchema,
        lineTotal: webhookMoneySchema,
      }),
    ),
    trackingNumber: z.string().nullable(),
    note: z.string(),
    createdAt: z.string(),
    paidAt: z.string().nullable(),
    payment: z.object({
      provider: z.string().nullable(),
      providerRef: z.string().nullable(),
      slipStatus: z.enum(PAYMENT_SLIP_STATUSES).nullable(),
      slipUrl: z.string().nullable(),
    }),
  }),
});
export type OrderWebhookPayload = z.infer<typeof orderWebhookPayloadSchema>;

/* ------------------------------------------------------------------ products */

const priceSchema = z.number().int().min(0).max(100_000_000);

export const productImagesSchema = z
  .array(z.string().uuid())
  .max(MAX_PRODUCT_IMAGES, `ใส่รูปได้สูงสุด ${MAX_PRODUCT_IMAGES} รูป`)
  .default([]);

/** One row of the product specification table (label on the left, value on the right). */
export const productSpecSchema = z.object({
  label: z.string().trim().min(1).max(60),
  value: z.string().trim().min(1).max(200),
});
export type ProductSpec = z.infer<typeof productSpecSchema>;

/** A size/colour picker: one name and the values the buyer can choose. */
export const productOptionSchema = z.object({
  name: z.string().trim().min(1, 'กรุณากรอกชื่อตัวเลือก').max(40),
  values: z
    .array(z.string().trim().min(1).max(40))
    .min(1, 'ตัวเลือกต้องมีอย่างน้อยหนึ่งค่า')
    .max(MAX_OPTION_VALUES),
});
export type ProductOption = z.infer<typeof productOptionSchema>;

export const variantOptionsSchema = z.record(
  z.string().trim().min(1).max(40),
  z.string().trim().min(1).max(40),
);

export const productVariantInputSchema = z.object({
  id: z.string().uuid().optional(),
  /** Option name to chosen value, e.g. `{ "ไซซ์": "M", "สี": "ดำ" }`. */
  options: variantOptionsSchema,
  sku: z.string().trim().max(60).nullable().default(null),
  /** `null` inherits the product price. */
  price: priceSchema.nullable().default(null),
  compareAtPrice: priceSchema.nullable().default(null),
  stock: z.number().int().min(0).max(1_000_000).nullable().default(null),
});
export type ProductVariantInput = z.infer<typeof productVariantInputSchema>;

/** Checks a variant against the product's option list; returns an error message. */
export const variantIssue = (
  options: readonly ProductOption[],
  variant: ProductVariantInput,
): string | null => {
  const names = options.map((option) => option.name);
  const keys = Object.keys(variant.options);
  if (keys.length !== names.length) return 'ตัวเลือกของสินค้าแต่ละแบบไม่ครบ';
  for (const option of options) {
    const value = variant.options[option.name];
    if (!value) return `กรุณาเลือก${option.name}ให้ครบทุกแบบ`;
    if (!option.values.includes(value)) return `ค่า ${value} ไม่ได้อยู่ในตัวเลือก ${option.name}`;
  }
  if (keys.some((key) => !names.includes(key))) return 'มีชื่อตัวเลือกที่ไม่รู้จัก';
  return null;
};

/** Stable key for one combination, used for uniqueness and order snapshots. */
export const variantSignature = (
  options: readonly ProductOption[],
  variant: ProductVariantInput,
): string =>
  options.map((option) => `${option.name}=${variant.options[option.name] ?? ''}`).join('|');

export const variantLabel = (
  options: readonly ProductOption[],
  variant: ProductVariantInput,
): string =>
  options
    .map((option) => variant.options[option.name])
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' · ');

/** Total stock of a product that has variants; `null` when any variant is unlimited. */
export const variantStockTotal = (variants: readonly { stock: number | null }[]): number | null => {
  if (variants.length === 0) return null;
  if (variants.some((variant) => variant.stock === null)) return null;
  return variants.reduce((sum, variant) => sum + (variant.stock ?? 0), 0);
};

const productBaseSchema = z.object({
  title: z.string().trim().min(1, 'กรุณากรอกชื่อสินค้า').max(200),
  slug: slugSchema,
  description: z.string().trim().max(5_000).default(''),
  /** One-line selling point shown under the product name. */
  tagline: z.string().trim().max(160).default(''),
  /** Short introduction shown above the buy box. */
  summary: z.string().trim().max(600).default(''),
  /** Average review score; `null` hides the stars until the shop adds some. */
  rating: z.number().min(0).max(5).nullable().default(null),
  ratingCount: z.number().int().min(0).max(1_000_000).default(0),
  price: priceSchema,
  compareAtPrice: priceSchema.nullable().default(null),
  images: productImagesSchema,
  /** Spec table shown on the product page, e.g. wattage, lumens, base type. */
  specs: z.array(productSpecSchema).max(40).default([]),
  /** `null` means unlimited; a number is the remaining quantity. */
  stock: z.number().int().min(0).max(1_000_000).nullable().default(null),
  /** Shown on the delivery estimate; 0 means the shop does not use weight pricing. */
  weightGrams: z.number().int().min(0).max(1_000_000).default(0),
  options: z.array(productOptionSchema).max(MAX_PRODUCT_OPTIONS).default([]),
  variants: z.array(productVariantInputSchema).max(MAX_PRODUCT_VARIANTS).default([]),
  category: z.string().trim().max(60).nullable().default(null),
  status: z.enum(PRODUCT_STATUSES).default('draft'),
});

const productVariantIssues = (value: {
  price: number;
  options: ProductOption[];
  variants: ProductVariantInput[];
}): string | null => {
  if (value.options.length === 0) {
    return value.variants.length === 0 ? null : 'สินค้าที่ไม่มีตัวเลือกต้องไม่มีรายการแบบสินค้า';
  }
  if (value.variants.length === 0) return 'กรุณาเพิ่มแบบสินค้าอย่างน้อยหนึ่งแบบ';
  const names = value.options.map((option) => option.name);
  if (new Set(names).size !== names.length) return 'ชื่อตัวเลือกต้องไม่ซ้ำกัน';

  const seen = new Set<string>();
  for (const variant of value.variants) {
    const issue = variantIssue(value.options, variant);
    if (issue) return issue;
    const signature = variantSignature(value.options, variant);
    if (seen.has(signature)) return 'มีแบบสินค้าที่ซ้ำกัน';
    seen.add(signature);
    const price = variant.price ?? value.price;
    if (variant.compareAtPrice !== null && variant.compareAtPrice <= price) {
      return 'ราคาก่อนลดของแบบสินค้าต้องมากกว่าราคาขาย';
    }
  }
  return null;
};

export const createProductInputSchema = productBaseSchema
  .refine((value) => value.compareAtPrice == null || value.compareAtPrice > value.price, {
    message: 'ราคาก่อนลดต้องมากกว่าราคาขาย',
    path: ['compareAtPrice'],
  })
  .superRefine((value, context) => {
    const issue = productVariantIssues(value);
    if (issue)
      context.addIssue({ code: z.ZodIssueCode.custom, message: issue, path: ['variants'] });
  });
export type CreateProductInput = z.infer<typeof createProductInputSchema>;

export const updateProductInputSchema = productBaseSchema
  .partial()
  .refine(
    (value) =>
      value.compareAtPrice == null || value.price == null || value.compareAtPrice > value.price,
    { message: 'ราคาก่อนลดต้องมากกว่าราคาขาย', path: ['compareAtPrice'] },
  );
export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

/** Full product input is checked again after a partial update is merged. */
export const assertProductVariants = productVariantIssues;

export const productListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export interface ProductSummary {
  id: string;
  title: string;
  slug: string;
  description: string;
  /** One-line selling point shown under the product name. */
  tagline: string;
  /** Short introduction above the buy box. */
  summary: string;
  /** Average review score; `null` hides the stars. */
  rating: number | null;
  ratingCount: number;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  images: string[];
  /** Media ids in display order, so the admin can edit the gallery. */
  imageIds: string[];
  /** Specification rows rendered as a table on the product page. */
  specs: ProductSpec[];
  stock: number | null;
  weightGrams: number;
  options: ProductOption[];
  variants: ProductVariant[];
  category: string | null;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  options: Record<string, string>;
  signature: string;
  label: string;
  sku: string | null;
  /** `null` means the variant inherits the product price. */
  price: number | null;
  compareAtPrice: number | null;
  stock: number | null;
}

export interface ProductList {
  items: ProductSummary[];
  cursor: string | null;
  total: number;
}

export interface ShopVariant {
  id: string;
  options: Record<string, string>;
  label: string;
  sku: string | null;
  /** Effective price, already inheriting the product price. */
  price: number;
  compareAtPrice: number | null;
  stock: number | null;
  inStock: boolean;
}

export interface ShopProduct {
  id: string;
  title: string;
  slug: string;
  description: string;
  tagline: string;
  summary: string;
  rating: number | null;
  ratingCount: number;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  images: string[];
  stock: number | null;
  inStock: boolean;
  weightGrams: number;
  options: ProductOption[];
  variants: ShopVariant[];
  category: string | null;
  specs: ProductSpec[];
}

export const isInStock = (stock: number | null): boolean => stock === null || stock > 0;

/* --------------------------------------------------------------------- cart */

export const cartItemInputSchema = z.object({
  productId: z.string().uuid(),
  /** The chosen size/colour combination, when the product has options. */
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).max(MAX_CART_QUANTITY),
});
export type CartItemInput = z.infer<typeof cartItemInputSchema>;

export const cartInputSchema = z.object({
  items: z.array(cartItemInputSchema).max(MAX_CART_ITEMS, 'ตะกร้ามีสินค้าได้สูงสุด 50 รายการ'),
  /** Province is optional here; checkout always sends the customer's real one. */
  province: z.string().trim().max(120).optional(),
});
export type CartInput = z.infer<typeof cartInputSchema>;

/** One offer that added free units to the cart. */
export interface CartPromotion {
  title: string;
  freeQuantity: number;
}

export interface CartLine {
  product: ShopProduct;
  variantId: string | null;
  variantLabel: string | null;
  /** Units the customer pays for. */
  quantity: number;
  lineTotal: number;
  /** Units the shop adds free, from a "ซื้อ X แถม Y" promotion. */
  freeQuantity: number;
  /** Title of the offer that added them, for the cart line. */
  promotionTitle: string | null;
}

export interface ShopCart {
  items: CartLine[];
  /** Units the customer pays for. */
  count: number;
  /** Everything the cart adds for free (sum of the lines' free units). */
  freeCount: number;
  subtotal: number;
  shippingFee: number;
  weightGrams: number;
  total: number;
  currency: string;
  /** Offers applied to this cart, for the summary banner. */
  promotions: CartPromotion[];
}

/** Province names are compared loosely: "จ.เชียงใหม่" matches "เชียงใหม่". */
export const normalizeProvince = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/^จังหวัด/, '')
    .replace(/^จ\./, '')
    .replace(/\s+/g, '');

export const shippingFeeFor = (
  subtotal: number,
  settings: CommerceSettings,
  context: { weightGrams?: number; province?: string | null } = {},
): number => {
  if (subtotal <= 0) return 0;
  if (settings.freeShippingThreshold !== null && subtotal >= settings.freeShippingThreshold)
    return 0;

  const province = context.province ? normalizeProvince(context.province) : '';
  const zone = province
    ? settings.shippingZones.find((candidate) =>
        candidate.provinces.some((name) => normalizeProvince(name) === province),
      )
    : undefined;
  const base = zone ? zone.fee : settings.shippingFee;

  const weightGrams = context.weightGrams ?? 0;
  const kilograms = weightGrams > 0 ? Math.ceil(weightGrams / 1000) : 0;
  return base + kilograms * settings.shippingPerKgFee;
};

/**
 * How many units a "ซื้อ X แถม Y" offer gives for this quantity. The gift never
 * exceeds what the customer pays for, so a stray setting cannot make it negative.
 */
export const giftQuantityFor = (
  buyQty: number | null | undefined,
  getQty: number | null | undefined,
  quantity: number,
): number => {
  if (!buyQty || !getQty || buyQty < 1 || getQty < 1 || quantity < buyQty) return 0;
  return Math.min(Math.floor(quantity / buyQty) * getQty, quantity);
};

export const cartTotals = (
  lines: readonly { price: number; quantity: number; weightGrams?: number }[],
  settings: CommerceSettings,
  context: { province?: string | null } = {},
): Pick<ShopCart, 'subtotal' | 'shippingFee' | 'weightGrams' | 'total'> => {
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const weightGrams = lines.reduce((sum, line) => sum + (line.weightGrams ?? 0) * line.quantity, 0);
  const shippingFee = shippingFeeFor(subtotal, settings, {
    weightGrams,
    province: context.province,
  });
  return { subtotal, shippingFee, weightGrams, total: subtotal + shippingFee };
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cartLineKey = (item: { productId: string; variantId?: string }): string =>
  item.variantId ? `${item.productId}:${item.variantId}` : item.productId;

/**
 * `id:qty` or `id:variantId:qty` in the cart cookie; the shorter form keeps
 * carts written before product options existed working unchanged.
 */
export const parseCartCookie = (raw: string | null | undefined): CartItemInput[] => {
  if (!raw) return [];
  const merged = new Map<string, CartItemInput>();

  for (const part of raw.split(',')) {
    const pieces = part.split(':');
    const [id, payload, quantityText] =
      pieces.length >= 3 ? [pieces[0], pieces[1], pieces[2]] : [pieces[0], null, pieces[1]];
    if (!id || !UUID_PATTERN.test(id)) continue;
    const variantId = payload && UUID_PATTERN.test(payload) ? payload : undefined;
    const quantity = Number(quantityText);
    if (!Number.isInteger(quantity) || quantity < 1) continue;

    const key = cartLineKey({ productId: id, variantId });
    const existing = merged.get(key);
    merged.set(key, {
      productId: id,
      ...(variantId ? { variantId } : {}),
      quantity: Math.min((existing?.quantity ?? 0) + quantity, MAX_CART_QUANTITY),
    });
  }

  return [...merged.values()].slice(0, MAX_CART_ITEMS);
};

export const serializeCartCookie = (items: readonly CartItemInput[]): string =>
  items
    .filter((item) => UUID_PATTERN.test(item.productId) && item.quantity > 0)
    .slice(0, MAX_CART_ITEMS)
    .map((item) => {
      const quantity = Math.min(item.quantity, MAX_CART_QUANTITY);
      return item.variantId && UUID_PATTERN.test(item.variantId)
        ? `${item.productId}:${item.variantId}:${quantity}`
        : `${item.productId}:${quantity}`;
    })
    .join(',');

/* -------------------------------------------------------------------- orders */

export const orderCustomerSchema = z.object({
  name: z.string().trim().min(1, 'กรุณากรอกชื่อผู้รับ').max(120),
  phone: z
    .string()
    .trim()
    .regex(/^0\d{8,9}$/, 'เบอร์โทรต้องเป็นตัวเลข 9-10 หลักและเริ่มด้วย 0'),
  email: z.string().trim().email('อีเมลไม่ถูกต้อง').max(200).nullable().default(null),
  address: z.string().trim().min(1, 'กรุณากรอกที่อยู่').max(300),
  subdistrict: z.string().trim().max(120).default(''),
  district: z.string().trim().max(120).default(''),
  province: z.string().trim().min(1, 'กรุณากรอกจังหวัด').max(120),
  postcode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก'),
});
export type OrderCustomer = z.infer<typeof orderCustomerSchema>;

export const ORDER_HONEYPOT_FIELD = '_hp';

export const createOrderInputSchema = z.object({
  items: z.array(cartItemInputSchema).min(1, 'ตะกร้ายังว่างอยู่').max(MAX_CART_ITEMS),
  customer: orderCustomerSchema,
  paymentMethod: z.enum(SHOP_PAYMENT_METHODS),
  note: z.string().trim().max(MAX_ORDER_NOTE).default(''),
  honeypot: z.string().max(200).optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

export const orderListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
});
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

export const updateOrderStatusInputSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  trackingNumber: z.string().trim().max(80).nullable().optional(),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusInputSchema>;

export const refundOrderInputSchema = z.object({
  /** Defaults to the whole order; never more than it. */
  amount: z.number().int().min(1).max(100_000_000).optional(),
  reason: z.string().trim().max(300).default(''),
  /** Return the items to stock so the shop can sell them again. */
  restock: z.boolean().default(true),
});
export type RefundOrderInput = z.infer<typeof refundOrderInputSchema>;

export const paymentSlipInputSchema = z.object({
  /** Amount the buyer says they transferred, in satang. */
  amount: z.number().int().min(1).max(100_000_000),
  /** Bank transaction reference, used to reject the same slip twice. */
  reference: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{4,60}$/, 'เลขอ้างอิงสลิปต้องเป็นตัวอักษรหรือตัวเลข 4-60 ตัว'),
  /** Data URL of the slip photo; the server sniffs the real file type. */
  image: z
    .string()
    .min(100)
    .max(Math.ceil(MAX_SLIP_BYTES * 4) / 3 + 64),
});
export type PaymentSlipInput = z.infer<typeof paymentSlipInputSchema>;

export const reviewSlipInputSchema = z.object({
  status: z.enum(['verified', 'rejected']),
  note: z.string().trim().max(300).default(''),
});
export type ReviewSlipInput = z.infer<typeof reviewSlipInputSchema>;

export const slipSubmissionSchema = z.object({
  status: z.enum(PAYMENT_SLIP_STATUSES),
  /** True when the amount matched and the payment was confirmed immediately. */
  autoVerified: z.boolean(),
  message: z.string(),
});
export type SlipSubmission = z.infer<typeof slipSubmissionSchema>;

export interface OrderSlip {
  id: string;
  status: PaymentSlipStatus;
  amount: number;
  reference: string;
  imageUrl: string;
  note: string;
  createdAt: string;
}

export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'completed', 'cancelled', 'refunded'],
  shipped: ['completed', 'refunded'],
  completed: ['refunded'],
  cancelled: [],
  refunded: [],
};

/** Money came in, so the shop may still send it back. */
export const canRefundOrder = (status: OrderStatus): boolean =>
  status === 'paid' || status === 'shipped' || status === 'completed';

export const canTransitionOrder = (from: OrderStatus, to: OrderStatus): boolean =>
  from === to || ORDER_TRANSITIONS[from].includes(to);

export interface OrderLine {
  productId: string | null;
  /** Null when the product had no options or was deleted. */
  variantId: string | null;
  /** Snapshot such as "M · ดำ", kept even after the product changes. */
  variantLabel: string | null;
  title: string;
  price: number;
  quantity: number;
  image: string | null;
  lineTotal: number;
}

export interface OrderSummary {
  id: string;
  number: string;
  status: OrderStatus;
  paymentMethod: ShopPaymentMethod;
  customerName: string;
  customerPhone: string;
  itemsCount: number;
  subtotal: number;
  shippingFee: number;
  total: number;
  currency: string;
  trackingNumber: string | null;
  paymentUrl: string | null;
  createdAt: string;
  paidAt: string | null;
  /** Amount already sent back to the buyer, in satang. */
  refundedAmount: number;
  refundedAt: string | null;
}

export interface OrderDetail extends OrderSummary {
  customer: OrderCustomer;
  note: string;
  items: OrderLine[];
  slip: OrderSlip | null;
  /** Why the shop returned the money; empty unless refunded. */
  refundReason: string;
}

export interface OrderList {
  items: OrderSummary[];
  cursor: string | null;
  total: number;
}

/** What the buyer is allowed to see, fetched by the unguessable token. */
export interface PublicOrder {
  number: string;
  token: string;
  status: OrderStatus;
  paymentMethod: ShopPaymentMethod;
  customerName: string;
  customerPhone: string;
  items: OrderLine[];
  subtotal: number;
  shippingFee: number;
  total: number;
  currency: string;
  trackingNumber: string | null;
  paymentUrl: string | null;
  slip: OrderSlip | null;
  createdAt: string;
  paidAt: string | null;
  /** Money the shop returned, so the buyer sees it on the order page. */
  refundedAmount: number;
  refundedAt: string | null;
  refundReason: string;
}

export interface OrderPaymentInfo {
  /** EMVCo payload for the PromptPay QR, only while the order is pending. */
  promptPayPayload: string | null;
  promptPayId: string | null;
  /** Hosted page for a card (Stripe) or bank gateway payment. */
  redirectUrl: string | null;
}

export interface OrderCreated {
  order: PublicOrder;
  payment: OrderPaymentInfo;
}

/* ------------------------------------------------------------------- shop UI */

export interface ShopHome {
  products: ShopProduct[];
  categories: string[];
  settings: CommerceSettings;
  currency: string;
}

export interface ShopProductPage {
  product: ShopProduct;
  related: ShopProduct[];
  settings: CommerceSettings;
}

/* ----------------------------------------------------------------- promptpay */

const tlv = (tag: string, value: string): string =>
  `${tag}${String(value.length).padStart(2, '0')}${value}`;

/** CRC-16/CCITT-FALSE, the checksum PromptPay puts in tag 63. */
export const crc16 = (input: string): string => {
  let crc = 0xffff;
  for (let index = 0; index < input.length; index += 1) {
    crc ^= input.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

/** Phone numbers become `0066…`, national/tax ids stay as they are. */
export const promptPayTarget = (id: string): string => {
  const digits = id.replace(/\D/g, '');
  if (/^0\d{9}$/.test(digits)) return `0066${digits.slice(1)}`;
  return digits;
};

/**
 * Dynamic PromptPay QR payload (EMVCo). Scanned by any Thai banking app, so the
 * shop can take money without a payment gateway or a stored card.
 */
export const promptPayPayload = (id: string, amountSatang: number): string => {
  const target = promptPayTarget(id);
  if (target.length === 0 || amountSatang <= 0) {
    throw new Error('PromptPay ต้องมีเบอร์พร้อมเพย์และยอดเงินที่มากกว่าศูนย์');
  }

  const merchant = tlv('00', 'A000000677010111') + tlv(/^0066/.test(target) ? '01' : '02', target);
  const body =
    tlv('00', '01') +
    tlv('01', '12') +
    tlv('29', merchant) +
    tlv('53', '764') +
    tlv('54', (amountSatang / 100).toFixed(2)) +
    tlv('58', 'TH');
  const withCrcTag = `${body}6304`;
  return `${withCrcTag}${crc16(withCrcTag)}`;
};

/* --------------------------------------------------------------- admin input */

/** Order number shown to the buyer, e.g. `LM-261022-7K4Q`. */
export const orderNumberFor = (date: Date, suffix: string): string => {
  const year = String(date.getUTCFullYear()).slice(2);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `LM-${year}${month}${day}-${suffix.toUpperCase().slice(0, 6)}`;
};

export const ORDER_NUMBER_PATTERN = /^LM-\d{6}-[A-Z0-9]{4,6}$/;

/** Digits of a phone number, so "081-234-5678" and "0812345678" are the same. */
export const phoneDigits = (value: string): string => value.replace(/\D/g, '');

/**
 * True when the phone or email a visitor typed is the one the order was placed
 * with. Only the digits are compared so dashes, spaces and a country code do not
 * stop a buyer from opening their own receipt.
 */
export const contactMatchesOrder = (
  customer: { phone?: unknown; email?: unknown },
  contact: string,
): boolean => {
  const typed = contact.trim();
  if (typed.includes('@')) {
    const email = typeof customer.email === 'string' ? customer.email.trim().toLowerCase() : '';
    return email.length > 0 && email === typed.toLowerCase();
  }
  const digits = phoneDigits(typed);
  const phone = typeof customer.phone === 'string' ? phoneDigits(customer.phone) : '';
  const local = phone.startsWith('66') ? `0${phone.slice(2)}` : phone;
  const typedLocal = digits.startsWith('66') && digits.length > 9 ? `0${digits.slice(2)}` : digits;
  return typedLocal.length >= 9 && local === typedLocal;
};

/**
 * Lets a buyer open an order they already placed, without an account: the
 * number printed on the receipt plus the phone or email used at checkout.
 */
export const orderLookupInputSchema = z.object({
  number: z
    .string()
    .trim()
    .toUpperCase()
    .regex(ORDER_NUMBER_PATTERN, 'เลขคำสั่งซื้อต้องอยู่ในรูปแบบ LM-261022-7K4Q'),
  contact: z.string().trim().min(6, 'กรุณากรอกเบอร์โทรหรืออีเมลที่ใช้สั่งซื้อ').max(200),
  honeypot: z.string().max(200).optional(),
});
export type OrderLookupInput = z.infer<typeof orderLookupInputSchema>;

/* ------------------------------------------------------------------ payloads */

export const shopVariantSchema = z.object({
  id: z.string(),
  options: z.record(z.string(), z.string()),
  label: z.string(),
  sku: z.string().nullable(),
  price: z.number().int(),
  compareAtPrice: z.number().int().nullable(),
  stock: z.number().int().nullable(),
  inStock: z.boolean(),
});

export const shopProductSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  tagline: z.string().default(''),
  summary: z.string().default(''),
  rating: z.number().nullable().default(null),
  ratingCount: z.number().int().default(0),
  price: z.number().int(),
  compareAtPrice: z.number().int().nullable(),
  currency: z.string(),
  images: z.array(z.string()),
  stock: z.number().int().nullable(),
  inStock: z.boolean(),
  weightGrams: z.number().int().default(0),
  options: z.array(productOptionSchema).default([]),
  variants: z.array(shopVariantSchema).default([]),
  category: z.string().nullable(),
  specs: z.array(productSpecSchema).default([]),
});

export const shopChromeSchema = z.object({
  site: publicSiteSchema,
  menus: publicMenusSchema,
  globalBlocks: publicGlobalBlocksSchema,
  locale: z.string(),
});

export const shopHomeResponseSchema = shopChromeSchema.extend({
  products: z.array(shopProductSchema),
  categories: z.array(z.string()),
  settings: commerceSettingsSchema,
});
export type ShopHomeResponse = z.infer<typeof shopHomeResponseSchema>;

export const shopProductResponseSchema = shopChromeSchema.extend({
  product: shopProductSchema,
  related: z.array(shopProductSchema),
  settings: commerceSettingsSchema,
});
export type ShopProductResponse = z.infer<typeof shopProductResponseSchema>;

export const cartPromotionSchema = z.object({
  title: z.string(),
  freeQuantity: z.number().int(),
});

export const cartLineSchema = z.object({
  product: shopProductSchema,
  variantId: z.string().nullable().default(null),
  variantLabel: z.string().nullable().default(null),
  quantity: z.number().int(),
  lineTotal: z.number().int(),
  freeQuantity: z.number().int().default(0),
  promotionTitle: z.string().nullable().default(null),
});

export const shopCartSchema = z.object({
  items: z.array(cartLineSchema),
  count: z.number().int(),
  freeCount: z.number().int().default(0),
  subtotal: z.number().int(),
  shippingFee: z.number().int(),
  weightGrams: z.number().int().default(0),
  total: z.number().int(),
  currency: z.string(),
  promotions: z.array(cartPromotionSchema).default([]),
});

export const shopCartResponseSchema = shopChromeSchema.extend({
  cart: shopCartSchema,
  settings: commerceSettingsSchema,
});
export type ShopCartResponse = z.infer<typeof shopCartResponseSchema>;

export const orderLineSchema = z.object({
  productId: z.string().nullable(),
  variantId: z.string().nullable().default(null),
  variantLabel: z.string().nullable().default(null),
  title: z.string(),
  price: z.number().int(),
  quantity: z.number().int(),
  image: z.string().nullable(),
  lineTotal: z.number().int(),
});

export const orderSlipSchema = z.object({
  id: z.string(),
  status: z.enum(PAYMENT_SLIP_STATUSES),
  amount: z.number().int(),
  reference: z.string(),
  imageUrl: z.string(),
  note: z.string(),
  createdAt: z.string(),
});

export const publicOrderSchema = z.object({
  number: z.string(),
  token: z.string(),
  status: z.enum(ORDER_STATUSES),
  paymentMethod: z.enum(SHOP_PAYMENT_METHODS),
  customerName: z.string(),
  customerPhone: z.string(),
  items: z.array(orderLineSchema),
  subtotal: z.number().int(),
  shippingFee: z.number().int(),
  total: z.number().int(),
  currency: z.string(),
  trackingNumber: z.string().nullable(),
  /** Stripe Checkout page while a card payment is pending. */
  paymentUrl: z.string().nullable(),
  slip: orderSlipSchema.nullable().default(null),
  createdAt: z.string(),
  paidAt: z.string().nullable(),
  refundedAmount: z.number().int().default(0),
  refundedAt: z.string().nullable().default(null),
  refundReason: z.string().default(''),
});

export const orderPaymentInfoSchema = z.object({
  promptPayPayload: z.string().nullable(),
  promptPayId: z.string().nullable(),
  /** Hosted card page the browser should open, when the method is card. */
  redirectUrl: z.string().nullable(),
});

export const orderCreatedSchema = z.object({
  order: publicOrderSchema,
  payment: orderPaymentInfoSchema,
});
export type OrderCreatedResponse = z.infer<typeof orderCreatedSchema>;

export const shopOrderResponseSchema = shopChromeSchema.extend({
  order: publicOrderSchema,
  payment: orderPaymentInfoSchema,
  settings: commerceSettingsSchema,
});
export type ShopOrderResponse = z.infer<typeof shopOrderResponseSchema>;

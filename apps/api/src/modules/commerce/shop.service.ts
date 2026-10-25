import { randomBytes, randomUUID } from 'node:crypto';
import { Inject, Injectable, Optional } from '@nestjs/common';
import type {
  Media,
  Order,
  OrderItem,
  PaymentSlip,
  Prisma,
  Product,
  ProductVariant as ProductVariantRow,
} from '@prisma/client';
import {
  MAX_SLIP_BYTES,
  cartInputSchema,
  cartTotals,
  isHoneypotFilled,
  isInStock,
  isOrderStatus,
  isPaymentSlipStatus,
  isShopPaymentMethod,
  orderNumberFor,
  paymentSlipInputSchema,
  promptPayPayload,
  receiptFromOrder,
  readCommerceSettings,
  readBankSettings,
  isFeatureOn,
  parseDisabledFeatures,
  siteFeatureFlagsFromSettings,
  bankCredentialsReady,
  bblGatewayReady,
  type BankSettings,
  type BankVerification,
  type CartInput,
  type ReceiptInput,
  type SlipSubmission,
  type CommerceSettings,
  type CreateOrderInput,
  type OrderCreatedResponse,
  type OrderLine,
  type PaymentSlipInput,
  type PaymentSlipStatus,
  type PublicOrder,
  type ShopCart,
  type ShopCartResponse,
  type ShopHomeResponse,
  type ShopOrderResponse,
  type ShopProduct,
  type ShopProductResponse,
  type ShopVariant,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { verifyBblTransfer } from '../banking/bbl';
import { bblConfigForSite } from '../banking/bbl-settings';
import { createBblPayment } from '../banking/bbl-gateway';
import { apiPublicUrl, mediaPublicBaseUrl } from '../media/media.config';
import { toPublicMediaUrl } from '../media/media-url';
import {
  MEDIA_STORAGE,
  extensionForMime,
  sniffImageMime,
  type MediaStorage,
} from '../media/media.storage';
import { PrismaService } from '../prisma/prisma.service';
import { PublicService } from '../public/public.service';
import { OrderNotifier, publicSiteUrl } from './order-notifier';
import { OrderWebhookNotifier } from './order-webhook';
import { createStripeOrderSession, shopCardEnabled } from './stripe-order';

const MAX_SHOP_PRODUCTS = 60;
const MAX_RELATED = 4;

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const readImageIds = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

const readProductSpecs = (value: unknown): ShopProduct['specs'] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const record = asRecord(entry);
    const label = typeof record.label === 'string' ? record.label : '';
    const specValue = typeof record.value === 'string' ? record.value : '';
    return label && specValue ? [{ label, value: specValue }] : [];
  });
};

const mediaIndex = (rows: readonly Media[]): Map<string, Media> =>
  new Map(rows.map((row) => [row.id, row]));

type ProductWithVariants = Product & { variants?: ProductVariantRow[] };

const readProductOptions = (value: unknown): ShopProduct['options'] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const record = asRecord(entry);
    const name = typeof record.name === 'string' ? record.name : '';
    const values = Array.isArray(record.values)
      ? record.values.filter((item): item is string => typeof item === 'string')
      : [];
    return name && values.length > 0 ? [{ name, values }] : [];
  });
};

const readVariantOptions = (value: unknown): Record<string, string> => {
  const record = asRecord(value);
  return Object.fromEntries(
    Object.entries(record).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
};

const toShopVariant = (row: ProductVariantRow, productPrice: number): ShopVariant => {
  const stock = row.stock;
  return {
    id: row.id,
    options: readVariantOptions(row.options),
    label: row.label,
    sku: row.sku,
    price: row.price ?? productPrice,
    compareAtPrice: row.compareAtPrice,
    stock,
    inStock: isInStock(stock),
  };
};

const toShopProduct = (row: ProductWithVariants, media: Map<string, Media>): ShopProduct => {
  const options = readProductOptions(row.options);
  const variants = (row.variants ?? []).map((variant) => toShopVariant(variant, row.price));
  const inStock =
    variants.length > 0 ? variants.some((variant) => variant.inStock) : isInStock(row.stock);

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    tagline: row.tagline,
    summary: row.summary,
    rating: row.rating,
    ratingCount: row.ratingCount,
    price: row.price,
    compareAtPrice: row.compareAtPrice,
    currency: row.currency,
    images: readImageIds(row.images)
      .map((id) => toPublicMediaUrl(media.get(id) ?? null))
      .filter((url): url is string => url !== null),
    stock: row.stock,
    inStock,
    weightGrams: row.weightGrams,
    options,
    variants,
    category: row.category,
    specs: readProductSpecs(row.specs),
  };
};

const toOrderLine = (row: OrderItem): OrderLine => ({
  productId: row.productId,
  variantId: row.variantId,
  variantLabel: row.variantLabel,
  title: row.title,
  price: row.price,
  quantity: row.quantity,
  image: row.image,
  lineTotal: row.price * row.quantity,
});

type SlipMime = NonNullable<ReturnType<typeof sniffImageMime>>;

const decodeSlipImage = (value: string): { buffer: Buffer; mime: SlipMime } | null => {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(value);
  const declared = match?.[1];
  const payload = match?.[2];
  if (!declared || !payload) return null;
  const buffer = Buffer.from(payload.replace(/\s+/g, ''), 'base64');
  if (buffer.length === 0 || buffer.length > MAX_SLIP_BYTES) return null;
  const mime = sniffImageMime(buffer);
  return mime && mime === declared ? { buffer, mime } : null;
};

const slipStorageKey = (siteId: string, mime: SlipMime, now: Date): string => {
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${siteId}/slips/${now.getUTCFullYear()}/${month}/${randomUUID()}.${extensionForMime(mime)}`;
};

const toOrderSlip = (row: PaymentSlip) => ({
  id: row.id,
  status: isPaymentSlipStatus(row.status) ? row.status : ('pending_review' as PaymentSlipStatus),
  amount: row.amount,
  reference: row.reference,
  imageUrl: row.imageUrl,
  note: row.note,
  createdAt: row.createdAt.toISOString(),
});

const customerNameOf = (value: unknown): string => {
  const name = asRecord(value).name;
  return typeof name === 'string' ? name : '';
};

/** Buyers see their own number masked; the admin sees it in full. */
const maskPhone = (phone: string): string =>
  phone.length < 6
    ? phone
    : `${phone.slice(0, 2)}${'x'.repeat(phone.length - 5)}${phone.slice(-3)}`;

const toPublicOrder = (row: Order & { items: OrderItem[]; slips?: PaymentSlip[] }): PublicOrder => {
  const customer = asRecord(row.customer);
  const phone = typeof customer.phone === 'string' ? customer.phone : '';
  const slip = row.slips?.[0];
  return {
    number: row.number,
    token: row.token,
    status: isOrderStatus(row.status) ? row.status : 'pending',
    paymentMethod: isShopPaymentMethod(row.paymentMethod) ? row.paymentMethod : 'promptpay',
    customerName: customerNameOf(row.customer),
    customerPhone: maskPhone(phone),
    items: row.items.map(toOrderLine),
    subtotal: row.subtotal,
    shippingFee: row.shippingFee,
    total: row.total,
    currency: row.currency,
    trackingNumber: row.trackingNumber,
    paymentUrl: row.paymentUrl,
    slip: slip ? toOrderSlip(slip) : null,
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    refundedAmount: row.refundedAmount,
    refundedAt: row.refundedAt ? row.refundedAt.toISOString() : null,
    refundReason: row.refundReason,
  };
};

const publicSettings = (settings: CommerceSettings, bank: BankSettings): CommerceSettings => ({
  ...settings,
  payments: {
    ...settings.payments,
    card: settings.payments.card && shopCardEnabled(),
    bbl: settings.payments.bbl && bblGatewayReady(bank),
  },
});

const paymentInfo = (
  order: {
    status: string;
    paymentMethod: string;
    total: number;
    paymentUrl?: string | null;
  },
  settings: CommerceSettings,
): { promptPayPayload: string | null; promptPayId: string | null; redirectUrl: string | null } => {
  if (order.status !== 'pending') {
    return { promptPayPayload: null, promptPayId: null, redirectUrl: null };
  }
  if (order.paymentMethod === 'promptpay' && settings.promptPayId) {
    return {
      promptPayPayload: promptPayPayload(settings.promptPayId, order.total),
      promptPayId: settings.promptPayId,
      redirectUrl: null,
    };
  }
  if ((order.paymentMethod === 'card' || order.paymentMethod === 'bbl') && order.paymentUrl) {
    return { promptPayPayload: null, promptPayId: null, redirectUrl: order.paymentUrl };
  }
  return { promptPayPayload: null, promptPayId: null, redirectUrl: null };
};

/** Public storefront: catalog, cart pricing, checkout and order lookup. */
@Injectable()
export class ShopService {
  constructor(
    private readonly db: PrismaService,
    private readonly publicContent: PublicService,
    private readonly notifier: OrderNotifier,
    @Optional() private readonly webhooks?: OrderWebhookNotifier,
    @Optional() @Inject(MEDIA_STORAGE) private readonly storage?: MediaStorage,
  ) {}

  /** The shop respects the site's feature switch, including the platform kill switch. */
  private assertShopOpen(settings: unknown): void {
    if (!isFeatureOn('commerce', {
      flags: siteFeatureFlagsFromSettings(settings),
      disabled: parseDisabledFeatures(process.env.LUMIO_DISABLED_FEATURES),
    })) {
      throw ApiException.notFound('ร้านค้านี้ยังไม่เปิดให้เข้าชม');
    }
  }

  async home(host: string, locale?: string): Promise<ShopHomeResponse> {
    const { siteId, ...chrome } = await this.publicContent.chrome(host, locale);
    this.assertShopOpen(chrome.site.settings);
    const bank = readBankSettings(asRecord(chrome.site.settings).banking);
    const settings = publicSettings(
      readCommerceSettings(asRecord(chrome.site.settings).commerce),
      bank,
    );

    return this.db.forSite(siteId, async (tx) => {
      const rows = await tx.product.findMany({
        where: { status: 'active' },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: MAX_SHOP_PRODUCTS,
        include: { variants: { orderBy: [{ position: 'asc' }, { id: 'asc' }] } },
      });
      const media = mediaIndex(
        await tx.media.findMany({
          where: { id: { in: rows.flatMap((row) => readImageIds(row.images)) } },
        }),
      );
      const products = rows.map((row) => toShopProduct(row, media));
      const categories = [
        ...new Set(products.flatMap((item) => (item.category ? [item.category] : []))),
      ];

      return { ...chrome, products, categories, settings };
    });
  }

  async product(host: string, slug: string, locale?: string): Promise<ShopProductResponse> {
    const { siteId, ...chrome } = await this.publicContent.chrome(host, locale);
    this.assertShopOpen(chrome.site.settings);
    const bank = readBankSettings(asRecord(chrome.site.settings).banking);
    const settings = publicSettings(
      readCommerceSettings(asRecord(chrome.site.settings).commerce),
      bank,
    );

    return this.db.forSite(siteId, async (tx) => {
      const row = await tx.product.findFirst({
        where: { slug, status: 'active' },
        include: { variants: { orderBy: [{ position: 'asc' }, { id: 'asc' }] } },
      });
      if (!row) throw ApiException.notFound('ไม่พบสินค้านี้');

      const relatedRows = await tx.product.findMany({
        where: {
          status: 'active',
          NOT: { id: row.id },
          ...(row.category ? { category: row.category } : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: MAX_RELATED,
        include: { variants: { orderBy: [{ position: 'asc' }, { id: 'asc' }] } },
      });
      const all = [row, ...relatedRows];
      const media = mediaIndex(
        await tx.media.findMany({
          where: { id: { in: all.flatMap((item) => readImageIds(item.images)) } },
        }),
      );

      return {
        ...chrome,
        product: toShopProduct(row, media),
        related: relatedRows.map((item) => toShopProduct(item, media)),
        settings,
      };
    });
  }

  /** Prices always come from the database, never from the browser's cart. */
  async cart(host: string, input: CartInput, locale?: string): Promise<ShopCartResponse> {
    const parsed = cartInputSchema.parse(input);
    const { siteId, ...chrome } = await this.publicContent.chrome(host, locale);
    this.assertShopOpen(chrome.site.settings);
    const bank = readBankSettings(asRecord(chrome.site.settings).banking);
    const settings = publicSettings(
      readCommerceSettings(asRecord(chrome.site.settings).commerce),
      bank,
    );

    const cart = await this.db.forSite(siteId, (tx) =>
      this.priceCart(tx, parsed.items, settings, parsed.province ?? null),
    );
    return { ...chrome, cart, settings };
  }

  async createOrder(
    host: string,
    input: CreateOrderInput,
    locale?: string,
  ): Promise<OrderCreatedResponse> {
    if (isHoneypotFilled(input.honeypot)) {
      throw ApiException.validation('ไม่สามารถสร้างคำสั่งซื้อได้ กรุณาลองใหม่');
    }

    const { siteId, ...chrome } = await this.publicContent.chrome(host, locale);
    this.assertShopOpen(chrome.site.settings);
    const bank = readBankSettings(asRecord(chrome.site.settings).banking);
    const settings = readCommerceSettings(asRecord(chrome.site.settings).commerce);
    if (!settings.payments[input.paymentMethod]) {
      throw ApiException.validation('ร้านนี้ยังไม่เปิดรับชำระด้วยวิธีที่เลือก');
    }
    if (input.paymentMethod === 'promptpay' && !settings.promptPayId) {
      throw ApiException.conflict('ร้านยังไม่ได้ตั้งค่าพร้อมเพย์ กรุณาติดต่อร้านค้า');
    }
    if (input.paymentMethod === 'card' && !shopCardEnabled()) {
      throw ApiException.conflict('ร้านนี้ยังไม่เปิดรับบัตร กรุณาเลือกวิธีอื่น');
    }
    if (input.paymentMethod === 'bbl' && !bblGatewayReady(bank)) {
      throw ApiException.conflict('ร้านนี้ยังไม่เปิดรับชำระผ่านธนาคารกรุงเทพ กรุณาเลือกวิธีอื่น');
    }

    const requested = new Map<
      string,
      { productId: string; variantId: string | null; quantity: number }
    >();
    for (const item of input.items) {
      const key = `${item.productId}:${item.variantId ?? ''}`;
      const current = requested.get(key);
      requested.set(key, {
        productId: item.productId,
        variantId: item.variantId ?? null,
        quantity: (current?.quantity ?? 0) + item.quantity,
      });
    }

    const created = await this.db.forSite(siteId, async (tx) => {
      const siteInfo = await tx.site.findUnique({
        where: { id: siteId },
        select: {
          owner: { select: { email: true } },
          domains: {
            where: { isPrimary: true, sslStatus: 'active' },
            select: { hostname: true, isPrimary: true, sslStatus: true },
          },
        },
      });
      const products = await tx.product.findMany({
        where: {
          id: { in: [...new Set([...requested.values()].map((item) => item.productId))] },
          status: 'active',
        },
        include: { variants: { orderBy: [{ position: 'asc' }, { id: 'asc' }] } },
      });
      const productIds = new Set(products.map((row) => row.id));
      if ([...requested.values()].some((item) => !productIds.has(item.productId))) {
        throw ApiException.conflict('สินค้าบางรายการไม่พร้อมขายแล้ว กรุณาตรวจตะกร้าอีกครั้ง');
      }

      const byId = new Map(products.map((row) => [row.id, row]));
      const lines = [...requested.values()].map((item) => {
        const product = byId.get(item.productId);
        if (!product) throw ApiException.conflict('สินค้าบางรายการไม่พร้อมขายแล้ว');
        const options = readProductOptions(product.options);
        const variants = product.variants ?? [];
        if (options.length > 0 && !item.variantId) {
          throw ApiException.conflict(`กรุณาเลือกตัวเลือกของ "${product.title}"`);
        }
        if (item.variantId) {
          const variant = variants.find((row) => row.id === item.variantId);
          if (!variant) throw ApiException.conflict('ตัวเลือกสินค้าถูกเปลี่ยนแล้ว กรุณาเลือกใหม่');
          if (variant.stock !== null && variant.stock < item.quantity) {
            throw ApiException.conflict(`สินค้า "${product.title}" มีไม่พอ`);
          }
          return {
            product,
            variant,
            variantLabel: variant.label,
            price: variant.price ?? product.price,
            quantity: item.quantity,
          };
        }
        if (
          !isInStock(product.stock) ||
          (product.stock !== null && product.stock < item.quantity)
        ) {
          throw ApiException.conflict(`สินค้า "${product.title}" มีไม่พอ`);
        }
        return {
          product,
          variant: null,
          variantLabel: null,
          price: product.price,
          quantity: item.quantity,
        };
      });

      const totals = cartTotals(
        lines.map((line) => ({
          price: line.price,
          quantity: line.quantity,
          weightGrams: line.product.weightGrams,
        })),
        settings,
        { province: input.customer.province },
      );
      const media = mediaIndex(
        await tx.media.findMany({
          where: { id: { in: lines.flatMap((line) => readImageIds(line.product.images)) } },
        }),
      );
      const imageFor = (product: Product): string | null => {
        const id = readImageIds(product.images)[0];
        return id ? toPublicMediaUrl(media.get(id) ?? null) : null;
      };

      const number = orderNumberFor(new Date(), randomBytes(3).toString('hex'));
      const token = randomBytes(18).toString('hex');
      const order = await tx.order.create({
        data: {
          siteId,
          number,
          token,
          status: 'pending',
          paymentMethod: input.paymentMethod,
          customer: input.customer as unknown as Prisma.InputJsonValue,
          note: input.note,
          subtotal: totals.subtotal,
          shippingFee: totals.shippingFee,
          total: totals.total,
          currency: 'THB',
        },
      });

      await tx.orderItem.createMany({
        data: lines.map((line) => ({
          orderId: order.id,
          siteId,
          productId: line.product.id,
          variantId: line.variant?.id ?? null,
          variantLabel: line.variantLabel,
          title: line.product.title,
          price: line.price,
          quantity: line.quantity,
          image: imageFor(line.product),
        })),
      });

      // Conditional decrement: two buyers cannot take the same last item.
      for (const line of lines) {
        if (line.variant) {
          const taken = await tx.productVariant.updateMany({
            where: {
              id: line.variant.id,
              OR: [{ stock: null }, { stock: { gte: line.quantity } }],
            },
            data: { stock: { decrement: line.quantity } },
          });
          if (taken.count === 0) {
            throw ApiException.conflict(`สินค้า "${line.product.title}" มีไม่พอ`);
          }
        }
        const updated = await tx.product.updateMany({
          where: {
            id: line.product.id,
            OR: [{ stock: null }, { stock: { gte: line.quantity } }],
          },
          data: { stock: { decrement: line.quantity } },
        });
        if (updated.count === 0) {
          throw ApiException.conflict(`สินค้า "${line.product.title}" มีไม่พอ`);
        }
      }

      await tx.auditLog.create({
        data: {
          siteId,
          action: 'order.create',
          target: order.id,
          meta: { number: order.number, total: order.total, method: order.paymentMethod },
        },
      });

      const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
      return {
        order: { ...order, items },
        ownerEmail: siteInfo?.owner?.email ?? null,
        domains: siteInfo?.domains ?? [],
      };
    });

    let payment = paymentInfo(created.order, settings);
    if (input.paymentMethod === 'card') {
      try {
        const session = await createStripeOrderSession(fetch, {
          siteId,
          orderNumber: created.order.number,
          orderToken: created.order.token,
          customerEmail: input.customer.email,
          items: created.order.items.map((item) => ({
            title: item.title,
            price: item.price,
            quantity: item.quantity,
          })),
          shippingFee: created.order.shippingFee,
          publicUrl: publicSiteUrl({
            subdomain: chrome.site.subdomain,
            settings: chrome.site.settings,
            domains: created.domains,
          }),
        });
        await this.db.forSite(siteId, (tx) =>
          tx.order.update({
            where: { id: created.order.id },
            data: { provider: 'stripe', providerRef: session.id, paymentUrl: session.url },
          }),
        );
        created.order.paymentUrl = session.url;
        payment = paymentInfo(created.order, settings);
      } catch (error) {
        // A failed gateway call must not leave a pending order holding stock.
        await this.cancelPendingOrder(siteId, created.order.id, 'card_session_failed');
        throw error;
      }
    }

    if (input.paymentMethod === 'bbl') {
      try {
        const session = await createBblPayment(
          fetch,
          {
            siteId,
            orderNumber: created.order.number,
            orderToken: created.order.token,
            amount: created.order.total,
            customerEmail: input.customer.email,
            description: `คำสั่งซื้อ ${created.order.number}`,
            publicUrl: publicSiteUrl({
              subdomain: chrome.site.subdomain,
              settings: chrome.site.settings,
              domains: created.domains,
            }),
            apiUrl: apiPublicUrl(),
          },
          bblConfigForSite(bank),
        );
        await this.db.forSite(siteId, (tx) =>
          tx.order.update({
            where: { id: created.order.id },
            data: { provider: 'bbl', providerRef: session.id, paymentUrl: session.url },
          }),
        );
        created.order.paymentUrl = session.url;
        payment = paymentInfo(created.order, settings);
      } catch (error) {
        await this.cancelPendingOrder(siteId, created.order.id, 'bbl_session_failed');
        throw error;
      }
    }

    const noticeContext = {
      siteName: chrome.site.name,
      ownerEmail: created.ownerEmail,
      publicUrl: publicSiteUrl({
        subdomain: chrome.site.subdomain,
        settings: chrome.site.settings,
        domains: created.domains,
      }),
      settings,
      order: created.order,
    };
    void this.notifier.created(noticeContext).catch(() => undefined);
    void this.webhooks?.emit(
        {
          id: siteId,
          name: chrome.site.name,
          url: publicSiteUrl({
            subdomain: chrome.site.subdomain,
            settings: chrome.site.settings,
            domains: created.domains,
          }),
        },
        chrome.site.settings,
        'order.created',
        created.order,
      )
      .catch(() => undefined);

    return {
      order: toPublicOrder(created.order),
      payment,
    };
  }

  async order(host: string, token: string, locale?: string): Promise<ShopOrderResponse> {
    const { siteId, ...chrome } = await this.publicContent.chrome(host, locale);
    this.assertShopOpen(chrome.site.settings);
    const bank = readBankSettings(asRecord(chrome.site.settings).banking);
    const settings = publicSettings(
      readCommerceSettings(asRecord(chrome.site.settings).commerce),
      bank,
    );
    const row = await this.db.forSite(siteId, (tx) =>
      tx.order.findUnique({
        where: { token },
        include: { items: true, slips: { orderBy: { createdAt: 'desc' }, take: 1 } },
      }),
    );
    if (!row) throw ApiException.notFound('ไม่พบคำสั่งซื้อนี้');

    return {
      ...chrome,
      order: toPublicOrder(row),
      payment: paymentInfo(row, settings),
      settings,
    };
  }

  /**
   * A buyer uploads their bank slip. The slip is stored outside the media
   * library (it is private to one order), and is confirmed automatically when
   * the amount matches and the bank reference has never been used before.
   */
  async submitSlip(
    host: string,
    token: string,
    input: PaymentSlipInput,
    locale?: string,
  ): Promise<SlipSubmission> {
    const parsed = paymentSlipInputSchema.parse(input);
    const image = decodeSlipImage(parsed.image);
    if (!image) {
      throw ApiException.validation('สลิปต้องเป็นรูป JPG, PNG หรือ WebP ขนาดไม่เกิน 4MB');
    }
    if (!this.storage) {
      throw ApiException.conflict('ระบบจัดเก็บสลิปยังไม่พร้อม ลองอีกครั้ง');
    }

    const { siteId, site } = await this.publicContent.chrome(host, locale);
    this.assertShopOpen(site.settings);
    const settings = readCommerceSettings(asRecord(site.settings).commerce);
    if (!settings.payments.promptpay) {
      throw ApiException.conflict('ร้านนี้ไม่ได้เปิดรับชำระด้วยพร้อมเพย์');
    }

    const order = await this.db.forSite(siteId, (tx) =>
      tx.order.findUnique({
        where: { token },
        include: { items: true, slips: { orderBy: { createdAt: 'desc' }, take: 1 } },
      }),
    );
    if (!order) throw ApiException.notFound('ไม่พบคำสั่งซื้อนี้');
    if (order.status !== 'pending') {
      throw ApiException.conflict('คำสั่งซื้อนี้ไม่ได้รอชำระเงินแล้ว');
    }
    if (order.paymentMethod !== 'promptpay') {
      throw ApiException.conflict('คำสั่งซื้อนี้ไม่ได้ชำระผ่านพร้อมเพย์');
    }

    const key = slipStorageKey(siteId, image.mime, new Date());
    await this.storage.put(key, image.buffer, image.mime);
    const imageUrl = `${mediaPublicBaseUrl()}/${key}`;

    // A linked Bangkok Bank account is the source of truth: a transfer the bank
    // reports confirms the order, and an outage keeps the slip for review
    // instead of trusting only the amount the buyer typed.
    const bank = readBankSettings(asRecord(site.settings).banking);
    let bankCheck: BankVerification | null = null;
    if (bank.autoVerifySlips && bank.accountNumber !== null && bankCredentialsReady(bank)) {
      try {
        bankCheck = await verifyBblTransfer(
          globalThis.fetch.bind(globalThis),
          {
            accountNumber: bank.accountNumber,
            reference: parsed.reference,
            amount: order.total,
          },
          bblConfigForSite(bank),
        );
      } catch {
        // A rotated encryption key must not block the buyer's upload.
        bankCheck = {
          status: 'unavailable',
          matched: false,
          message: 'ตรวจสอบกับธนาคารไม่สำเร็จ ระบบเก็บสลิปไว้ให้ร้านตรวจสอบ',
          transfer: null,
        };
      }
    }

    const autoVerified = bankCheck
      ? bankCheck.status === 'verified'
      : parsed.amount === order.total;
    // The bank is authoritative about the amount; the typed figure is only a claim.
    const slipAmount = bankCheck?.transfer?.amount ?? parsed.amount;
    const reviewNote = bankCheck
      ? bankCheck.message
      : autoVerified
        ? 'ยืนยันอัตโนมัติจากยอดเงินที่ตรงกัน'
        : '';

    let result: SlipSubmission;
    try {
      result = await this.db.forSite(siteId, async (tx) => {
        const duplicate = await tx.paymentSlip.findFirst({
          where: { reference: parsed.reference },
          select: { id: true },
        });
        if (duplicate) {
          throw ApiException.conflict('สลิปนี้เคยส่งเข้ามาแล้ว กรุณาตรวจสอบอีกครั้ง');
        }

        await tx.paymentSlip.create({
          data: {
            siteId,
            orderId: order.id,
            status: autoVerified ? 'verified' : 'pending_review',
            amount: slipAmount,
            reference: parsed.reference,
            imageUrl,
            note: reviewNote,
          },
        });

        if (autoVerified) {
          await tx.order.update({
            where: { id: order.id },
            data: { status: 'paid', paidAt: order.paidAt ?? new Date() },
          });
          await tx.auditLog.create({
            data: {
              siteId,
              action: 'order.status',
              target: order.id,
              meta: {
                from: 'pending',
                to: 'paid',
                reason: bankCheck ? 'bbl_api_verified' : 'slip_auto_verified',
              },
            },
          });
        }
        await tx.auditLog.create({
          data: {
            siteId,
            action: 'order.slip.upload',
            target: order.id,
            meta: {
              reference: parsed.reference,
              amount: slipAmount,
              claimedAmount: parsed.amount,
              autoVerified,
              bank: bankCheck?.status ?? 'amount_check',
            },
          },
        });

        return {
          status: autoVerified ? ('verified' as const) : ('pending_review' as const),
          autoVerified,
          message: autoVerified
            ? bankCheck
              ? 'ได้รับสลิปแล้ว ธนาคารยืนยันว่าได้รับเงินตรงกับคำสั่งซื้อ ระบบยืนยันการชำระเงินให้ทันที'
              : 'ได้รับสลิปแล้ว ยอดเงินตรงกับคำสั่งซื้อ ระบบยืนยันการชำระเงินให้ทันที'
            : bankCheck?.status === 'unavailable'
              ? 'ได้รับสลิปแล้ว ระบบติดต่อธนาคารไม่ได้ชั่วคราว ร้านจะตรวจสอบและยืนยันให้เร็วที่สุด'
              : 'ได้รับสลิปแล้ว ร้านจะตรวจสอบและยืนยันการชำระเงินให้เร็วที่สุด',
        };
      });
    } catch (error) {
      await this.storage.remove(key).catch(() => undefined);
      throw error;
    }

    if (autoVerified) {
      const publicUrl = publicSiteUrl({
        subdomain: site.subdomain,
        settings: site.settings,
        domains: [],
      });
      const paidOrder = { ...order, status: 'paid', paidAt: new Date() };
      void this.notifier
        .statusChanged(
          {
            siteName: site.name,
            ownerEmail: null,
            publicUrl,
            settings,
            order: paidOrder,
          },
          'paid',
        )
        .catch(() => undefined);
      void this.webhooks
        ?.emit({ id: siteId, name: site.name, url: publicUrl }, site.settings, 'order.paid', {
          ...paidOrder,
          slips: [{ status: 'verified', imageUrl }],
        })
        .catch(() => undefined);
    }
    return result;
  }

  /** Data behind the printable receipt, shared by the HTML and PDF endpoints. */
  async receipt(host: string, token: string, locale?: string): Promise<ReceiptInput> {
    const { siteId, site } = await this.publicContent.chrome(host, locale);
    this.assertShopOpen(site.settings);
    const row = await this.db.forSite(siteId, (tx) =>
      tx.order.findUnique({ where: { token }, include: { items: true } }),
    );
    if (!row) throw ApiException.notFound('ไม่พบคำสั่งซื้อนี้');

    const scheme = /^(localhost|127\.)/.test(host) || host.includes(':') ? 'http' : 'https';
    return receiptFromOrder(row, {
      name: site.name,
      url: `${scheme}://${host}`,
    });
  }

  /** Undoes a pending order when the payment page could not be created. */
  private async cancelPendingOrder(
    siteId: string,
    orderId: string,
    reason: 'card_session_failed' | 'bbl_session_failed',
  ): Promise<void> {
    await this.db.forSite(siteId, async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order || order.status !== 'pending') return;

      for (const item of order.items) {
        if (item.variantId) {
          await tx.productVariant.updateMany({
            where: { id: item.variantId, stock: { not: null } },
            data: { stock: { increment: item.quantity } },
          });
        }
        if (!item.productId) continue;
        await tx.product.updateMany({
          where: { id: item.productId, stock: { not: null } },
          data: { stock: { increment: item.quantity } },
        });
      }
      await tx.order.update({ where: { id: orderId }, data: { status: 'cancelled' } });
      await tx.auditLog.create({
        data: {
          siteId,
          action: 'order.cancel',
          target: orderId,
          meta: { reason },
        },
      });
    });
  }

  private async priceCart(
    tx: Prisma.TransactionClient,
    items: readonly { productId: string; variantId?: string; quantity: number }[],
    settings: CommerceSettings,
    province: string | null = null,
  ): Promise<ShopCart> {
    if (items.length === 0) {
      return {
        items: [],
        count: 0,
        subtotal: 0,
        shippingFee: 0,
        weightGrams: 0,
        total: 0,
        currency: 'THB',
      };
    }

    const rows = await tx.product.findMany({
      where: { id: { in: items.map((item) => item.productId) }, status: 'active' },
      include: { variants: { orderBy: [{ position: 'asc' }, { id: 'asc' }] } },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    if (rows.length !== new Set(items.map((item) => item.productId)).size) {
      throw ApiException.conflict('สินค้าบางรายการไม่พร้อมขายแล้ว กรุณาตรวจตะกร้าอีกครั้ง');
    }

    const media = mediaIndex(
      await tx.media.findMany({
        where: { id: { in: rows.flatMap((row) => readImageIds(row.images)) } },
      }),
    );
    const lines = items.map((item) => {
      const row = byId.get(item.productId);
      if (!row) throw ApiException.conflict('สินค้าบางรายการไม่พร้อมขายแล้ว');
      const product = toShopProduct(row, media);
      if (product.options.length > 0 && !item.variantId) {
        throw ApiException.conflict(`กรุณาเลือกตัวเลือกของ "${product.title}"`);
      }
      if (item.variantId) {
        const variant = product.variants.find((entry) => entry.id === item.variantId);
        if (!variant) {
          throw ApiException.conflict('ตัวเลือกสินค้าถูกเปลี่ยนแล้ว กรุณาเลือกใหม่');
        }
        if (!variant.inStock || (variant.stock !== null && variant.stock < item.quantity)) {
          throw ApiException.conflict(`สินค้า "${product.title}" มีไม่พอ`);
        }
        return {
          product,
          variantId: variant.id,
          variantLabel: variant.label,
          quantity: item.quantity,
          unitPrice: variant.price,
          lineTotal: variant.price * item.quantity,
        };
      }
      return {
        product,
        variantId: null,
        variantLabel: null,
        quantity: item.quantity,
        unitPrice: product.price,
        lineTotal: product.price * item.quantity,
      };
    });
    const totals = cartTotals(
      lines.map((line) => ({
        price: line.unitPrice,
        quantity: line.quantity,
        weightGrams: line.product.weightGrams,
      })),
      settings,
      { province },
    );

    return {
      items: lines.map((line) => ({
        product: line.product,
        variantId: line.variantId,
        variantLabel: line.variantLabel,
        quantity: line.quantity,
        lineTotal: line.lineTotal,
      })),
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      ...totals,
      currency: 'THB',
    };
  }
}

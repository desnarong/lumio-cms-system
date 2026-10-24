import { Injectable, Optional } from '@nestjs/common';
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
  assertProductVariants,
  canRefundOrder,
  canTransitionOrder,
  commerceSettingsSchema,
  isOrderStatus,
  isPaymentSlipStatus,
  isShopPaymentMethod,
  orderCustomerSchema,
  orderWebhookViewSchema,
  ORDER_WEBHOOK_TEST_EVENT,
  readCommerceSettings,
  readOrderWebhookSettings,
  updateOrderWebhookInputSchema,
  variantLabel,
  variantSignature,
  variantStockTotal,
  type CommerceSettings,
  type ConnectLink,
  type ConnectStatus,
  type CreateProductInput,
  type OrderDetail,
  type OrderLine,
  type OrderWebhookView,
  type UpdateOrderWebhookInput,
  type OrderList,
  type OrderListQuery,
  type OrderSlip,
  type OrderSummary,
  type ProductList,
  type ProductListQuery,
  type ProductOption,
  type ProductSpec,
  type ProductStatus,
  type ProductSummary,
  type ProductVariant,
  type ProductVariantInput,
  type RefundOrderInput,
  type ReviewSlipInput,
  type UpdateCommerceSettingsInput,
  type UpdateOrderStatusInput,
  type UpdateProductInput,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { encryptSecret } from '../../common/secret-box';
import { toPublicMediaUrl } from '../media/media-url';
import { PrismaService } from '../prisma/prisma.service';
import { OrderNotifier, publicSiteUrl } from './order-notifier';
import { OrderWebhookNotifier, type WebhookOrderSource } from './order-webhook';
import {
  createConnectAccount,
  createConnectAccountLink,
  createConnectTransfer,
  fetchConnectAccount,
  sellerShare,
} from './stripe-connect';
import { shopCardEnabled } from './stripe-order';
import { isStripePaymentIntent, refundStripePayment } from './stripe-refund';

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const readImageIds = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

const readSpecs = (value: unknown): ProductSpec[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const record = asRecord(entry);
    const label = typeof record.label === 'string' ? record.label : '';
    const specValue = typeof record.value === 'string' ? record.value : '';
    return label && specValue ? [{ label, value: specValue }] : [];
  });
};

const readProductStatus = (value: string): ProductStatus =>
  value === 'active' || value === 'archived' ? value : 'draft';

/** Media rows for a set of ids, keyed for one query per list instead of per row. */
const mediaIndex = (rows: readonly Media[]): Map<string, Media> =>
  new Map(rows.map((row) => [row.id, row]));

const imageUrlsFor = (ids: readonly string[], media: Map<string, Media>): string[] =>
  ids
    .map((id) => toPublicMediaUrl(media.get(id) ?? null))
    .filter((url): url is string => url !== null);

const readOptions = (value: unknown): ProductOption[] => {
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
    Object.entries(record).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
};

const toProductVariant = (row: ProductVariantRow): ProductVariant => ({
  id: row.id,
  options: readVariantOptions(row.options),
  signature: row.signature,
  label: row.label,
  sku: row.sku,
  price: row.price,
  compareAtPrice: row.compareAtPrice,
  stock: row.stock,
});

type ProductWithVariants = Product & { variants?: ProductVariantRow[] };

const toProductSummary = (row: ProductWithVariants, media: Map<string, Media>): ProductSummary => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  description: row.description,
  price: row.price,
  compareAtPrice: row.compareAtPrice,
  currency: row.currency,
  images: imageUrlsFor(readImageIds(row.images), media),
  imageIds: readImageIds(row.images),
  specs: readSpecs(row.specs),
  stock: row.stock,
  weightGrams: row.weightGrams,
  options: readOptions(row.options),
  variants: (row.variants ?? []).map(toProductVariant),
  category: row.category,
  status: readProductStatus(row.status),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

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

export const toOrderSlip = (row: PaymentSlip): OrderSlip => ({
  id: row.id,
  status: isPaymentSlipStatus(row.status) ? row.status : 'pending_review',
  amount: row.amount,
  reference: row.reference,
  imageUrl: row.imageUrl,
  note: row.note,
  createdAt: row.createdAt.toISOString(),
});

const customerOf = (value: unknown) => {
  const parsed = orderCustomerSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  const record = asRecord(value);
  return {
    name: typeof record.name === 'string' ? record.name : '',
    phone: typeof record.phone === 'string' ? record.phone : '',
    email: null,
    address: '',
    subdistrict: '',
    district: '',
    province: '',
    postcode: '',
  };
};

const toOrderSummary = (row: Order & { _count?: { items: number } }): OrderSummary => {
  const customer = customerOf(row.customer);
  const status = isOrderStatus(row.status) ? row.status : 'pending';
  const paymentMethod = isShopPaymentMethod(row.paymentMethod) ? row.paymentMethod : 'promptpay';
  return {
    id: row.id,
    number: row.number,
    status,
    paymentMethod,
    customerName: customer.name,
    customerPhone: customer.phone,
    itemsCount: row._count?.items ?? 0,
    subtotal: row.subtotal,
    shippingFee: row.shippingFee,
    total: row.total,
    currency: row.currency,
    trackingNumber: row.trackingNumber,
    paymentUrl: row.paymentUrl,
    createdAt: row.createdAt.toISOString(),
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    refundedAmount: row.refundedAmount,
    refundedAt: row.refundedAt ? row.refundedAt.toISOString() : null,
  };
};

const toOrderDetail = (
  row: Order & { items: OrderItem[]; slips?: PaymentSlip[] },
): OrderDetail => ({
  ...toOrderSummary({ ...row, _count: { items: row.items.length } }),
  customer: customerOf(row.customer),
  note: row.note,
  items: row.items.map(toOrderLine),
  slip: row.slips?.[0] ? toOrderSlip(row.slips[0]) : null,
  refundReason: row.refundReason,
});

const variantRowsFor = (
  productId: string,
  siteId: string,
  options: readonly ProductOption[],
  variants: readonly ProductVariantInput[],
): Prisma.ProductVariantCreateManyInput[] =>
  variants.map((variant, index) => ({
    siteId,
    productId,
    signature: variantSignature(options, variant),
    options: variant.options as Prisma.InputJsonValue,
    label: variantLabel(options, variant),
    sku: variant.sku,
    price: variant.price,
    compareAtPrice: variant.compareAtPrice,
    stock: variant.stock,
    position: index,
  }));

/** Stock of a product with variants is the sum the buyer can actually pick. */
const stockAfterVariants = (
  options: readonly ProductOption[],
  variants: readonly ProductVariantInput[],
  fallback: number | null,
): number | null =>
  options.length === 0 ? fallback : variantStockTotal(variants);

const asJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

/** Admin side of the shop: products, orders and the payment settings. */
@Injectable()
export class CommerceService {
  constructor(
    private readonly db: PrismaService,
    private readonly notifier: OrderNotifier,
    @Optional() private readonly webhooks?: OrderWebhookNotifier,
  ) {}

  async getSettings(siteId: string): Promise<CommerceSettings> {
    const site = await this.db.forSite(siteId, (tx) =>
      tx.site.findUnique({ where: { id: siteId }, select: { settings: true } }),
    );
    if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
    return readCommerceSettings(asRecord(site.settings).commerce);
  }

  async updateSettings(
    siteId: string,
    input: UpdateCommerceSettingsInput,
    actorId: string,
  ): Promise<CommerceSettings> {
    const next = await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({ where: { id: siteId }, select: { settings: true } });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');

      const settings = asRecord(site.settings);
      const current = readCommerceSettings(settings.commerce);
      const merged = commerceSettingsSchema.parse({
        ...current,
        ...input,
        payments: {
          ...current.payments,
          ...(input.payments ?? {}),
        },
      });
      if (merged.payments.card && !shopCardEnabled()) {
        throw ApiException.validation(
          'ยังไม่ได้เชื่อมต่อ Stripe กรุณาตั้งค่า STRIPE_SECRET_KEY ก่อนเปิดรับบัตร',
        );
      }

      await tx.site.update({
        where: { id: siteId },
        data: { settings: asJson({ ...settings, commerce: merged }) },
      });
      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'commerce.settings.update',
          target: siteId,
          meta: { promptPayId: merged.promptPayId, shippingFee: merged.shippingFee },
        },
      });
      return merged;
    });
    return next;
  }

  /**
   * Outbound webhook settings. The signing secret is write-only: the admin sees
   * whether one is stored, never the value (docs/design/15-security.md 15.4).
   */
  async getWebhook(siteId: string): Promise<OrderWebhookView> {
    const site = await this.db.forSite(siteId, (tx) =>
      tx.site.findUnique({ where: { id: siteId }, select: { settings: true } }),
    );
    if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
    return this.webhookView(asRecord(site.settings));
  }

  async updateWebhook(
    siteId: string,
    input: UpdateOrderWebhookInput,
    actorId: string,
  ): Promise<OrderWebhookView> {
    const parsed = updateOrderWebhookInputSchema.parse(input);
    const view = await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({ where: { id: siteId }, select: { settings: true } });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');

      const settings = asRecord(site.settings);
      const current = readOrderWebhookSettings(settings.commerceWebhook);
      const secret =
        parsed.secret && parsed.secret.trim().length > 0
          ? encryptSecret(parsed.secret.trim())
          : current.secret;

      if (parsed.url.length > 0 && secret.length === 0) {
        throw ApiException.validation(
          'กรุณากำหนดความลับสำหรับลงชื่อ (secret) อย่างน้อย 16 ตัวอักษร ก่อนเปิดใช้ webhook',
        );
      }

      const next = { url: parsed.url, events: parsed.events, secret };
      await tx.site.update({
        where: { id: siteId },
        data: { settings: asJson({ ...settings, commerceWebhook: next }) },
      });
      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'commerce.webhook.update',
          target: siteId,
          meta: { url: next.url, events: next.events, secretSet: secret.length > 0 },
        },
      });
      return this.webhookView({ ...settings, commerceWebhook: next });
    });
    return orderWebhookViewSchema.parse(view);
  }

  /** Sends a sample "paid" order so the owner can verify their receiver. */
  async testWebhook(
    siteId: string,
    actorId: string,
  ): Promise<{ delivered: boolean; status: number | null; error: string | null }> {
    const site = await this.db.forSite(siteId, (tx) =>
      tx.site.findUnique({
        where: { id: siteId },
        select: {
          name: true,
          subdomain: true,
          settings: true,
          domains: {
            where: { isPrimary: true, sslStatus: 'active' },
            select: { hostname: true, isPrimary: true, sslStatus: true },
          },
        },
      }),
    );
    if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');

    const url = publicSiteUrl(site);
    const sample: WebhookOrderSource = {
      number: 'LM-TEST-0001',
      status: 'paid',
      paymentMethod: 'promptpay',
      currency: 'THB',
      subtotal: 25_000,
      shippingFee: 5_000,
      total: 30_000,
      customer: {
        name: 'ลูกค้าตัวอย่าง',
        phone: '0812345678',
        email: null,
        address: '123 ถนนทดสอบ',
        subdistrict: 'บางรัก',
        district: 'บางรัก',
        province: 'กรุงเทพมหานคร',
        postcode: '10500',
      },
      note: 'อีเวนต์ทดสอบจาก Lumio',
      trackingNumber: null,
      createdAt: new Date(),
      paidAt: new Date(),
      provider: null,
      providerRef: null,
      items: [
        { title: 'สินค้าตัวอย่าง', variantLabel: null, price: 25_000, quantity: 1 },
      ],
    };

    const result = (await this.webhooks?.emit(
      { id: siteId, name: site.name, url },
      site.settings,
      ORDER_WEBHOOK_TEST_EVENT,
      sample,
    )) ?? { delivered: false, status: null, error: 'ระบบส่ง webhook ยังไม่พร้อมใช้งาน' };
    await this.db.forSite(siteId, (tx) =>
      tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'commerce.webhook.test',
          target: siteId,
          meta: { delivered: result.delivered, status: result.status },
        },
      }),
    );
    return result;
  }

  private webhookView(settings: Record<string, unknown>): OrderWebhookView {
    const webhook = readOrderWebhookSettings(settings.commerceWebhook);
    return {
      url: webhook.url,
      events: webhook.events,
      secretSet: webhook.secret.length > 0,
      enabled: webhook.url.length > 0 && webhook.secret.length > 0,
    };
  }

  async connectStatus(siteId: string): Promise<ConnectStatus> {
    const settings = await this.getSettings(siteId);
    return {
      accountId: settings.stripeAccountId,
      chargesEnabled: settings.stripeChargesEnabled,
      payoutsEnabled: settings.stripePayoutsEnabled,
    };
  }

  /**
   * Creates the seller's Express account once and returns a fresh onboarding
   * link. Stripe links expire, so the admin asks for a new one every time.
   */
  async connectLink(
    siteId: string,
    actorId: string,
    email: string | null,
  ): Promise<ConnectLink> {
    if (!shopCardEnabled()) {
      throw ApiException.conflict(
        'ยังไม่ได้เชื่อมต่อ Stripe กรุณาตั้งค่า STRIPE_SECRET_KEY ก่อนรับเงินจากผู้ซื้อ',
      );
    }

    const current = await this.getSettings(siteId);
    const accountId =
      current.stripeAccountId ??
      (await createConnectAccount(globalThis.fetch.bind(globalThis), { siteId, email }));

    if (!current.stripeAccountId) {
      await this.db.forSite(siteId, async (tx) => {
        const site = await tx.site.findUnique({
          where: { id: siteId },
          select: { settings: true },
        });
        if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
        const settings = asRecord(site.settings);
        const commerce = readCommerceSettings(settings.commerce);
        await tx.site.update({
          where: { id: siteId },
          data: {
            settings: asJson({
              ...settings,
              commerce: { ...commerce, stripeAccountId: accountId },
            }),
          },
        });
        await tx.auditLog.create({
          data: {
            siteId,
            userId: actorId,
            action: 'commerce.connect.create_account',
            target: accountId,
            meta: {},
          },
        });
      });
    }

    const origin = (process.env.ADMIN_ORIGIN ?? 'http://localhost:49300').replace(/\/+$/, '');
    const url = await createConnectAccountLink(globalThis.fetch.bind(globalThis), {
      accountId,
      refreshUrl: `${origin}/commerce/settings?connect=refresh`,
      returnUrl: `${origin}/commerce/settings?connect=return`,
    });
    return { url, accountId };
  }

  /** Re-reads the account so the admin screen shows the real onboarding state. */
  async refreshConnect(siteId: string, actorId: string): Promise<ConnectStatus> {
    const current = await this.getSettings(siteId);
    if (!current.stripeAccountId) {
      return { accountId: null, chargesEnabled: false, payoutsEnabled: false };
    }

    const account = await fetchConnectAccount(
      globalThis.fetch.bind(globalThis),
      current.stripeAccountId,
    );
    await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({
        where: { id: siteId },
        select: { settings: true },
      });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
      const settings = asRecord(site.settings);
      const commerce = readCommerceSettings(settings.commerce);
      await tx.site.update({
        where: { id: siteId },
        data: {
          settings: asJson({
            ...settings,
            commerce: {
              ...commerce,
              stripeChargesEnabled: account.chargesEnabled,
              stripePayoutsEnabled: account.payoutsEnabled,
            },
          }),
        },
      });
      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'commerce.connect.refresh',
          target: account.id,
          meta: {
            chargesEnabled: account.chargesEnabled,
            payoutsEnabled: account.payoutsEnabled,
          },
        },
      });
    });

    return {
      accountId: account.id,
      chargesEnabled: account.chargesEnabled,
      payoutsEnabled: account.payoutsEnabled,
    };
  }

  async listProducts(siteId: string, query: ProductListQuery): Promise<ProductList> {
    return this.db.forSite(siteId, async (tx) => {
      const where = {
        ...(query.status ? { status: query.status } : {}),
        ...(query.q
          ? {
              OR: [
                { title: { contains: query.q, mode: 'insensitive' as const } },
                { category: { contains: query.q, mode: 'insensitive' as const } },
                { slug: { contains: query.q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      };

      const rows = await tx.product.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: query.limit + 1,
        include: { variants: { orderBy: [{ position: 'asc' }, { id: 'asc' }] } },
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      });
      const total = await tx.product.count({ where });
      const items = rows.slice(0, query.limit);
      const media = mediaIndex(
        await tx.media.findMany({
          where: { id: { in: items.flatMap((row) => readImageIds(row.images)) } },
        }),
      );

      return {
        items: items.map((row) => toProductSummary(row, media)),
        cursor: rows.length > query.limit ? (items.at(-1)?.id ?? null) : null,
        total,
      };
    });
  }

  async createProduct(
    siteId: string,
    input: CreateProductInput,
    actorId: string,
  ): Promise<ProductSummary> {
    return this.db.forSite(siteId, async (tx) => {
      await this.assertImages(tx, input.images);
      const clash = await tx.product.findFirst({ where: { slug: input.slug }, select: { id: true } });
      if (clash) throw ApiException.conflict('ชื่อลิงก์นี้ถูกใช้แล้ว');

      const created = await tx.product.create({
        data: {
          siteId,
          title: input.title,
          slug: input.slug,
          description: input.description,
          price: input.price,
          compareAtPrice: input.compareAtPrice,
          images: asJson(input.images),
          specs: asJson(input.specs),
          stock: stockAfterVariants(input.options, input.variants, input.stock),
          weightGrams: input.weightGrams,
          options: asJson(input.options),
          category: input.category,
          status: input.status,
        },
      });
      if (input.variants.length > 0) {
        await tx.productVariant.createMany({
          data: variantRowsFor(created.id, siteId, input.options, input.variants),
        });
      }
      const row =
        input.variants.length > 0
          ? await tx.product.findUniqueOrThrow({
              where: { id: created.id },
              include: { variants: { orderBy: [{ position: 'asc' }, { id: 'asc' }] } },
            })
          : created;
      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'product.create',
          target: row.id,
          meta: { title: row.title, price: row.price, variants: input.variants.length },
        },
      });
      return toProductSummary(row, await this.mediaFor(tx, input.images));
    });
  }

  async updateProduct(
    siteId: string,
    productId: string,
    input: UpdateProductInput,
    actorId: string,
  ): Promise<ProductSummary> {
    return this.db.forSite(siteId, async (tx) => {
      const current = await tx.product.findUnique({
        where: { id: productId },
        include: { variants: { orderBy: [{ position: 'asc' }, { id: 'asc' }] } },
      });
      if (!current) throw ApiException.notFound('ไม่พบสินค้านี้');

      if (input.images) await this.assertImages(tx, input.images);
      if (input.slug && input.slug !== current.slug) {
        const clash = await tx.product.findFirst({
          where: { slug: input.slug, NOT: { id: productId } },
          select: { id: true },
        });
        if (clash) throw ApiException.conflict('ชื่อลิงก์นี้ถูกใช้แล้ว');
      }

      const price = input.price ?? current.price;
      const compareAt =
        input.compareAtPrice === undefined ? current.compareAtPrice : input.compareAtPrice;
      if (compareAt !== null && compareAt <= price) {
        throw ApiException.validation('ราคาก่อนลดต้องมากกว่าราคาขาย');
      }

      const nextOptions = input.options ?? readOptions(current.options);
      const existingVariants: ProductVariantInput[] = (current.variants ?? []).map((row) => ({
        id: row.id,
        options: readVariantOptions(row.options),
        sku: row.sku,
        price: row.price,
        compareAtPrice: row.compareAtPrice,
        stock: row.stock,
      }));
      const nextVariants = input.variants ?? existingVariants;
      const replaceVariants = input.options !== undefined || input.variants !== undefined;
      const variantIssue = assertProductVariants({
        price,
        options: nextOptions,
        variants: nextVariants,
      });
      if (variantIssue) throw ApiException.validation(variantIssue);

      const row = await tx.product.update({
        where: { id: productId },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.slug !== undefined ? { slug: input.slug } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.price !== undefined ? { price: input.price } : {}),
          ...(input.compareAtPrice !== undefined ? { compareAtPrice: input.compareAtPrice } : {}),
          ...(input.images !== undefined ? { images: asJson(input.images) } : {}),
          ...(input.specs !== undefined ? { specs: asJson(input.specs) } : {}),
          ...(input.weightGrams !== undefined ? { weightGrams: input.weightGrams } : {}),
          ...(input.options !== undefined ? { options: asJson(nextOptions) } : {}),
          ...(replaceVariants
            ? { stock: stockAfterVariants(nextOptions, nextVariants, input.stock ?? current.stock) }
            : input.stock !== undefined
              ? { stock: input.stock }
              : {}),
          ...(input.category !== undefined ? { category: input.category } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
      });
      if (replaceVariants) {
        await tx.productVariant.deleteMany({ where: { productId } });
        if (nextVariants.length > 0) {
          await tx.productVariant.createMany({
            data: variantRowsFor(productId, siteId, nextOptions, nextVariants),
          });
        }
      }
      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'product.update',
          target: productId,
          meta: { title: row.title, variants: nextVariants.length },
        },
      });
      const ids = readImageIds(row.images);
      const updated = replaceVariants
        ? await tx.product.findUniqueOrThrow({
            where: { id: productId },
            include: { variants: { orderBy: [{ position: 'asc' }, { id: 'asc' }] } },
          })
        : { ...row, variants: current.variants ?? [] };
      return toProductSummary(updated, await this.mediaFor(tx, ids));
    });
  }

  /** Archiving keeps the row (and old orders) intact so it can be restored. */
  async archiveProduct(siteId: string, productId: string, actorId: string): Promise<void> {
    await this.db.forSite(siteId, async (tx) => {
      const current = await tx.product.findUnique({
        where: { id: productId },
        select: { title: true },
      });
      if (!current) throw ApiException.notFound('ไม่พบสินค้านี้');
      await tx.product.update({ where: { id: productId }, data: { status: 'archived' } });
      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'product.archive',
          target: productId,
          meta: { title: current.title },
        },
      });
    });
  }

  async listOrders(siteId: string, query: OrderListQuery): Promise<OrderList> {
    return this.db.forSite(siteId, async (tx) => {
      const where = {
        ...(query.status ? { status: query.status } : {}),
        ...(query.q
          ? {
              OR: [
                { number: { contains: query.q, mode: 'insensitive' as const } },
                { trackingNumber: { contains: query.q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      };

      const rows = await tx.order.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: query.limit + 1,
        include: { _count: { select: { items: true } } },
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      });
      const total = await tx.order.count({ where });
      const items = rows.slice(0, query.limit);
      return {
        items: items.map(toOrderSummary),
        cursor: rows.length > query.limit ? (items.at(-1)?.id ?? null) : null,
        total,
      };
    });
  }

  async getOrder(siteId: string, orderId: string): Promise<OrderDetail> {
    const row = await this.db.forSite(siteId, (tx) =>
      tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, slips: { orderBy: { createdAt: 'desc' }, take: 1 } },
      }),
    );
    if (!row) throw ApiException.notFound('ไม่พบคำสั่งซื้อนี้');
    return toOrderDetail(row);
  }

  async updateOrderStatus(
    siteId: string,
    orderId: string,
    input: UpdateOrderStatusInput,
    actorId: string | null,
  ): Promise<OrderDetail> {
    const result = await this.db.forSite(siteId, async (tx) => {
      const current = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, slips: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });
      if (!current) throw ApiException.notFound('ไม่พบคำสั่งซื้อนี้');
      const from = isOrderStatus(current.status) ? current.status : 'pending';
      if (input.status === 'refunded') {
        // A refund moves money, so it goes through the refund endpoint only.
        throw ApiException.conflict('ใช้ปุ่ม “คืนเงินลูกค้า” เพื่อคืนเงินพร้อมบันทึกยอด');
      }
      if (!canTransitionOrder(from, input.status)) {
        throw ApiException.conflict('เปลี่ยนสถานะนี้ไม่ได้ในขั้นตอนปัจจุบัน');
      }

      if (input.status === 'cancelled' && from !== 'cancelled') {
        for (const item of current.items) {
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
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: input.status,
          ...(input.trackingNumber !== undefined ? { trackingNumber: input.trackingNumber } : {}),
          ...(input.status === 'paid' && current.paidAt === null ? { paidAt: new Date() } : {}),
        },
      });
      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'order.status',
          target: orderId,
          meta: { from, to: input.status },
        },
      });

      const updated = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { items: true, slips: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });
      const site = await tx.site.findUnique({
        where: { id: siteId },
        select: {
          name: true,
          subdomain: true,
          settings: true,
          domains: {
            where: { isPrimary: true, sslStatus: 'active' },
            select: { hostname: true, isPrimary: true, sslStatus: true },
          },
        },
      });
      return { detail: toOrderDetail(updated), order: updated, site };
    });

    if (result.site) {
      void this.notifier
        .statusChanged(
          {
            siteName: result.site.name,
            ownerEmail: null,
            publicUrl: publicSiteUrl({
              subdomain: result.site.subdomain,
              settings: result.site.settings,
              domains: result.site.domains,
            }),
            settings: readCommerceSettings(asRecord(result.site.settings).commerce),
            order: result.order,
          },
          input.status,
        )
        .catch(() => undefined);

      const url = publicSiteUrl({
        subdomain: result.site.subdomain,
        settings: result.site.settings,
        domains: result.site.domains,
      });
      void this.webhooks?.emit(
          { id: siteId, name: result.site.name, url },
          result.site.settings,
          input.status === 'paid' ? 'order.paid' : 'order.status',
          result.order,
        )
        .catch(() => undefined);
    }

    return result.detail;
  }

  /** Admin approves or rejects the slip a buyer uploaded for a PromptPay order. */
  async reviewSlip(
    siteId: string,
    orderId: string,
    input: ReviewSlipInput,
    actorId: string,
  ): Promise<OrderDetail> {
    const result = await this.db.forSite(siteId, async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, slips: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });
      if (!order) throw ApiException.notFound('ไม่พบคำสั่งซื้อนี้');
      const slip = order.slips[0];
      if (!slip) throw ApiException.notFound('ยังไม่มีสลิปของคำสั่งซื้อนี้');

      const site = await tx.site.findUnique({
        where: { id: siteId },
        select: {
          name: true,
          subdomain: true,
          settings: true,
          domains: {
            where: { isPrimary: true, sslStatus: 'active' },
            select: { hostname: true, isPrimary: true, sslStatus: true },
          },
        },
      });

      if (slip.status === input.status) {
        return { detail: toOrderDetail(order), order, site, paidNow: false };
      }

      await tx.paymentSlip.update({
        where: { id: slip.id },
        data: {
          status: input.status,
          note: input.note,
          reviewedBy: actorId,
          reviewedAt: new Date(),
        },
      });

      if (input.status === 'verified' && isOrderStatus(order.status) && order.status === 'pending') {
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'paid', paidAt: order.paidAt ?? new Date() },
        });
        await tx.auditLog.create({
          data: {
            siteId,
            userId: actorId,
            action: 'order.status',
            target: orderId,
            meta: { from: 'pending', to: 'paid', slipId: slip.id },
          },
        });
      }
      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: `order.slip.${input.status}`,
          target: orderId,
          meta: { slipId: slip.id, note: input.note },
        },
      });

      const updated = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { items: true, slips: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });
      const paidNow =
        input.status === 'verified' && isOrderStatus(order.status) && order.status === 'pending';
      return { detail: toOrderDetail(updated), order: updated, site, paidNow };
    });

    if (result.paidNow && result.site) {
      const url = publicSiteUrl({
        subdomain: result.site.subdomain,
        settings: result.site.settings,
        domains: result.site.domains,
      });
      void this.webhooks?.emit(
          { id: siteId, name: result.site.name, url },
          result.site.settings,
          'order.paid',
          result.order,
        )
        .catch(() => undefined);
    }

    return result.detail;
  }

  /** Applied from a verified Stripe webhook, where no signed-in user exists. */
  async markOrderPaidByNumber(
    siteId: string,
    orderNumber: string,
    providerRef: string | null,
  ): Promise<boolean> {
    const found = await this.db.forSite(siteId, (tx) =>
      tx.order.findFirst({
        where: { number: orderNumber },
        select: { id: true, status: true },
      }),
    );
    if (!found) return false;
    if (found.status === 'paid') return true;

    await this.updateOrderStatus(siteId, found.id, { status: 'paid' }, null);
    if (providerRef) {
      await this.db.forSite(siteId, (tx) =>
        tx.order.update({ where: { id: found.id }, data: { providerRef } }),
      );
    }
    void this.transferOrderEarnings(siteId, orderNumber).catch(() => undefined);
    return true;
  }

  /**
   * Sends money back to the buyer (docs/design/03-scope.md 3.3). Card payments
   * are refunded through Stripe with the payment intent the webhook stored;
   * every other method is returned by the shop itself, and the row keeps the
   * amount, the reason and the provider reference for the books.
   */
  async refundOrder(
    siteId: string,
    orderId: string,
    input: RefundOrderInput,
    actorId: string,
  ): Promise<OrderDetail> {
    const current = await this.db.forSite(siteId, (tx) =>
      tx.order.findUnique({ where: { id: orderId }, include: { items: true } }),
    );
    if (!current) throw ApiException.notFound('ไม่พบคำสั่งซื้อนี้');

    const from = isOrderStatus(current.status) ? current.status : 'pending';
    if (!canRefundOrder(from)) {
      throw ApiException.conflict('คำสั่งซื้อนี้ยังไม่ได้ชำระเงิน จึงคืนเงินไม่ได้');
    }

    const remaining = current.total - current.refundedAmount;
    const amount = input.amount ?? remaining;
    if (amount > remaining) {
      throw ApiException.validation('ยอดคืนเงินมากกว่ายอดที่ยังไม่ได้คืน');
    }

    // Stripe is called before the row changes: when the provider refuses, the
    // order still shows the money as taken, which is the truth.
    const refundRef = isStripePaymentIntent(current.providerRef)
      ? await refundStripePayment(globalThis.fetch.bind(globalThis), {
          paymentIntent: current.providerRef,
          amount,
          orderNumber: current.number,
        })
      : null;

    const result = await this.db.forSite(siteId, async (tx) => {
      const fresh = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true, slips: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });
      if (!fresh) throw ApiException.notFound('ไม่พบคำสั่งซื้อนี้');
      if (fresh.refundedAmount !== current.refundedAmount) {
        throw ApiException.conflict('มีคนอื่นกำลังคืนเงินคำสั่งซื้อนี้อยู่ กรุณาโหลดใหม่อีกครั้ง');
      }

      if (input.restock) {
        for (const item of fresh.items) {
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
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'refunded',
          refundedAmount: { increment: amount },
          refundedAt: new Date(),
          refundReason: input.reason,
          ...(refundRef ? { refundRef } : {}),
        },
      });
      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'order.refund',
          target: orderId,
          meta: { from, amount, restock: input.restock, reason: input.reason, refundRef },
        },
      });

      const updated = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { items: true, slips: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });
      const site = await tx.site.findUnique({
        where: { id: siteId },
        select: {
          name: true,
          subdomain: true,
          settings: true,
          domains: {
            where: { isPrimary: true, sslStatus: 'active' },
            select: { hostname: true, isPrimary: true, sslStatus: true },
          },
        },
      });
      return { detail: toOrderDetail(updated), order: updated, site };
    });

    if (result.site) {
      void this.notifier
        .statusChanged(
          {
            siteName: result.site.name,
            ownerEmail: null,
            publicUrl: publicSiteUrl({
              subdomain: result.site.subdomain,
              settings: result.site.settings,
              domains: result.site.domains,
            }),
            settings: readCommerceSettings(asRecord(result.site.settings).commerce),
            order: result.order,
          },
          'refunded',
        )
        .catch(() => undefined);

      const url = publicSiteUrl({
        subdomain: result.site.subdomain,
        settings: result.site.settings,
        domains: result.site.domains,
      });
      void this.webhooks
        ?.emit(
          { id: siteId, name: result.site.name, url },
          result.site.settings,
          'order.refunded',
          result.order,
        )
        .catch(() => undefined);
    }

    return result.detail;
  }

  /**
   * Moves the seller's share to their connected account once per order. A
   * failure is recorded but never blocks the webhook: the payment is already
   * safe, and the transfer can be retried from the audit trail.
   */
  async transferOrderEarnings(
    siteId: string,
    orderNumber: string,
  ): Promise<{ transferred: boolean; transferId: string | null }> {
    const found = await this.db.forSite(siteId, async (tx) => {
      const order = await tx.order.findFirst({
        where: { number: orderNumber },
        select: {
          id: true,
          number: true,
          total: true,
          currency: true,
          status: true,
          sellerTransferId: true,
        },
      });
      const site = await tx.site.findUnique({
        where: { id: siteId },
        select: { settings: true },
      });
      return { order, settings: readCommerceSettings(asRecord(site?.settings).commerce) };
    });

    const order = found.order;
    if (!order || order.status === 'pending' || order.status === 'cancelled') {
      return { transferred: false, transferId: null };
    }
    if (order.sellerTransferId) {
      return { transferred: false, transferId: order.sellerTransferId };
    }
    if (!found.settings.stripeAccountId || !found.settings.stripeChargesEnabled) {
      return { transferred: false, transferId: null };
    }

    const amount = sellerShare(order.total, found.settings.platformFeePercent);
    try {
      const transferId = await createConnectTransfer(globalThis.fetch.bind(globalThis), {
        accountId: found.settings.stripeAccountId,
        amount,
        orderNumber: order.number,
        currency: order.currency.toLowerCase(),
      });
      await this.db.forSite(siteId, async (tx) => {
        await tx.order.updateMany({
          where: { id: order.id, sellerTransferId: null },
          data: { sellerTransferId: transferId, sellerTransferAt: new Date() },
        });
        await tx.auditLog.create({
          data: {
            siteId,
            userId: null,
            action: 'order.seller_transfer',
            target: order.id,
            meta: { transferId, amount },
          },
        });
      });
      return { transferred: true, transferId };
    } catch (error) {
      await this.db
        .forSite(siteId, (tx) =>
          tx.auditLog.create({
            data: {
              siteId,
              userId: null,
              action: 'order.seller_transfer_failed',
              target: order.id,
              meta: { reason: error instanceof Error ? error.message : 'unknown' },
            },
          }),
        )
        .catch(() => undefined);
      return { transferred: false, transferId: null };
    }
  }

  private async mediaFor(
    tx: Prisma.TransactionClient,
    ids: readonly string[],
  ): Promise<Map<string, Media>> {
    if (ids.length === 0) return new Map();
    return mediaIndex(await tx.media.findMany({ where: { id: { in: [...ids] } } }));
  }

  /** A product may only point at images that belong to this site. */
  private async assertImages(tx: Prisma.TransactionClient, ids: readonly string[]): Promise<void> {
    if (ids.length === 0) return;
    const found = await tx.media.findMany({ where: { id: { in: [...ids] } }, select: { id: true } });
    if (found.length !== new Set(ids).size) {
      throw ApiException.validation('รูปบางรูปไม่พบในคลังรูปของเว็บนี้');
    }
  }
}

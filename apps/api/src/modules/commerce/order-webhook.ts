import { createHmac, randomUUID } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { Injectable, Logger } from '@nestjs/common';
import {
  ORDER_WEBHOOK_TEST_EVENT,
  assertFetchableManifestUrl,
  isPrivateHostname,
  isOrderStatus,
  isShopPaymentMethod,
  orderWebhookPayloadSchema,
  readOrderWebhookSettings,
  type OrderWebhookDeliveryEvent,
  type OrderWebhookPayload,
  type OrderWebhookSettings,
} from '@lumio/shared';
import { decryptSecret } from '../../common/secret-box';

export type WebhookFetch = typeof fetch;
export type WebhookLookup = (
  hostname: string,
  options: { all: true },
) => Promise<{ address: string; family: number }[]>;

export interface WebhookDeliveryOptions {
  fetchImpl?: WebhookFetch;
  lookupImpl?: WebhookLookup;
  timeoutMs?: number;
  attempts?: number;
  /** Backoff between attempts; tests pass 0 to stay fast. */
  retryDelayMs?: number;
  now?: () => Date;
}

export interface WebhookDeliveryResult {
  delivered: boolean;
  status: number | null;
  /** Human-readable reason when the receiver did not accept the event. */
  error: string | null;
}

/** The order fields the payload needs; keeps the notifier free of Prisma types. */
export interface WebhookOrderSource {
  number: string;
  status: string;
  paymentMethod: string;
  currency: string;
  subtotal: number;
  shippingFee: number;
  total: number;
  customer: unknown;
  note: string;
  trackingNumber: string | null;
  createdAt: Date | string;
  paidAt: Date | string | null;
  provider: string | null;
  providerRef: string | null;
  items: {
    title: string;
    variantLabel: string | null;
    price: number;
    quantity: number;
  }[];
  slips?: { status: string; imageUrl: string }[];
}

export interface WebhookSiteSource {
  id: string;
  name: string;
  url: string;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asIso = (value: Date | string | null): string | null => {
  if (value === null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const sleep = (ms: number): Promise<void> =>
  ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

/**
 * Every attempt resolves the host and refuses private answers: an owner could
 * otherwise point the webhook at `localhost` or a cloud metadata endpoint and
 * use the API as a proxy into its own network (docs/design/15-security.md 15.3).
 */
const assertPublicResolution = async (
  hostname: string,
  lookupImpl: WebhookLookup,
): Promise<URL> => {
  const url = assertFetchableManifestUrl(hostname, { allowHttp: false });
  if (isPrivateHostname(url.hostname)) {
    throw new Error('webhook ต้องอยู่บนโฮสต์สาธารณะ');
  }

  const literal = /^[\d.]+$/.test(url.hostname) || url.hostname.includes(':');
  if (literal) return url;

  const addresses = await lookupImpl(url.hostname, { all: true });
  if (addresses.length === 0 || addresses.some((entry) => isPrivateHostname(entry.address))) {
    throw new Error('webhook ต้องอยู่บนโฮสต์สาธารณะ');
  }
  return url;
};

/** `sha256=<hex>` over `<timestamp>.<raw body>`, the common Stripe-style format. */
export const webhookSignature = (secret: string, timestamp: number, body: string): string =>
  `sha256=${createHmac('sha256', secret).update(`${timestamp}.${body}`, 'utf8').digest('hex')}`;

/** Builds the documented payload from a stored order row. */
export const toWebhookPayload = (
  site: WebhookSiteSource,
  event: OrderWebhookDeliveryEvent,
  order: WebhookOrderSource,
  sentAt: Date = new Date(),
): OrderWebhookPayload => {
  const slip = order.slips?.[0];
  return orderWebhookPayloadSchema.parse({
    event,
    sentAt: sentAt.toISOString(),
    site: { id: site.id, name: site.name, url: site.url },
    order: {
      number: order.number,
      status: isOrderStatus(order.status) ? order.status : 'pending',
      paymentMethod: isShopPaymentMethod(order.paymentMethod) ? order.paymentMethod : 'promptpay',
      currency: order.currency,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      total: order.total,
      customer: asRecord(order.customer),
      items: order.items.map((item) => ({
        title: item.title,
        variantLabel: item.variantLabel,
        quantity: item.quantity,
        unitPrice: item.price,
        lineTotal: item.price * item.quantity,
      })),
      trackingNumber: order.trackingNumber,
      note: order.note,
      createdAt: asIso(order.createdAt) ?? new Date(0).toISOString(),
      paidAt: asIso(order.paidAt),
      payment: {
        provider: order.provider,
        providerRef: order.providerRef,
        slipStatus:
          slip && (slip.status === 'verified' || slip.status === 'rejected')
            ? slip.status
            : slip
              ? 'pending_review'
              : null,
        slipUrl: slip?.imageUrl ?? null,
      },
    },
  });
};

/**
 * Sends one signed event. A 4xx response is final (the receiver rejected the
 * request), while timeouts and 5xx are retried; every failure is reported, never
 * thrown, so a webhook can never break checkout or a status change.
 */
export const deliverWebhook = async (
  settings: OrderWebhookSettings,
  event: string,
  payload: OrderWebhookPayload,
  options: WebhookDeliveryOptions = {},
): Promise<WebhookDeliveryResult> => {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const lookupImpl = options.lookupImpl ?? lookup;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const attempts = Math.max(1, options.attempts ?? 3);
  const retryDelayMs = options.retryDelayMs ?? 400;

  if (settings.url.length === 0) {
    return { delivered: false, status: null, error: 'ยังไม่ได้ตั้งค่าที่อยู่ webhook' };
  }

  const secret = settings.secret.length > 0 ? decryptSecret(settings.secret) : '';
  if (secret.length === 0) {
    return { delivered: false, status: null, error: 'ยังไม่ได้ตั้งค่าความลับสำหรับลงชื่อ' };
  }

  const body = JSON.stringify(payload);
  let last: WebhookDeliveryResult = { delivered: false, status: null, error: null };

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let target: URL;
    try {
      target = await assertPublicResolution(settings.url, lookupImpl);
    } catch (error) {
      return {
        delivered: false,
        status: null,
        error: error instanceof Error ? error.message : 'ที่อยู่ webhook ไม่ถูกต้อง',
      };
    }

    const timestamp = Math.floor((options.now?.() ?? new Date()).getTime() / 1000);
    try {
      const response = await fetchImpl(target, {
        method: 'POST',
        redirect: 'manual',
        headers: {
          'content-type': 'application/json',
          'user-agent': 'Lumio-Webhook/1',
          'x-lumio-event': event,
          'x-lumio-delivery': randomUUID(),
          'x-lumio-timestamp': String(timestamp),
          'x-lumio-signature': webhookSignature(secret, timestamp, body),
        },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (response.ok) return { delivered: true, status: response.status, error: null };

      last = {
        delivered: false,
        status: response.status,
        error:
          response.status >= 300 && response.status < 400
            ? 'ปลายทาง webhook ตอบกลับด้วยการเปลี่ยนที่อยู่ ซึ่งไม่รองรับ'
            : `ปลายทางตอบกลับสถานะ ${response.status}`,
      };
      // The receiver understood the request and rejected it; retrying won't help.
      if (response.status < 500) return last;
    } catch {
      last = { delivered: false, status: null, error: 'ติดต่อปลายทาง webhook ไม่สำเร็จ' };
    }

    if (attempt < attempts) await sleep(retryDelayMs * attempt);
  }

  return last;
};

/**
 * Reads the site's settings on every event, so changing the URL in the admin
 * takes effect immediately and a disabled webhook costs one lookup.
 */
@Injectable()
export class OrderWebhookNotifier {
  private readonly logger = new Logger(OrderWebhookNotifier.name);

  settingsOf(siteSettings: unknown): OrderWebhookSettings {
    return readOrderWebhookSettings(asRecord(siteSettings).commerceWebhook);
  }

  /** Fire-and-forget: callers never await delivery on the buyer's path. */
  async emit(
    site: WebhookSiteSource,
    siteSettings: unknown,
    event: OrderWebhookDeliveryEvent,
    order: WebhookOrderSource,
    delivery: WebhookDeliveryOptions = {},
  ): Promise<WebhookDeliveryResult> {
    const settings = this.settingsOf(siteSettings);
    if (settings.url.length === 0) return { delivered: false, status: null, error: null };

    const subscribed =
      event === ORDER_WEBHOOK_TEST_EVENT ||
      settings.events.length === 0 ||
      settings.events.includes(event);
    if (!subscribed) return { delivered: false, status: null, error: null };

    const payload = toWebhookPayload(site, event, order);
    const result = await deliverWebhook(settings, event, payload, delivery);
    if (!result.delivered) {
      this.logger.warn(`Webhook ${event} for site ${site.id} failed: ${result.error ?? 'unknown'}`);
    }
    return result;
  }
}

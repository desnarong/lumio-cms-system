import { createHmac, timingSafeEqual } from 'node:crypto';
import { bblWebhookEventSchema, type BblWebhookEvent } from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { bblAccessToken, resetBblTokenCache, type BblConfig } from './bbl';

/**
 * Bangkok Bank payment gateway for shop buyers (docs/design/03-scope.md 3.3).
 *
 * The buyer chooses "ธนาคารกรุงเทพ" at checkout, the order is stored first, then
 * this client asks BBL to open a hosted payment page (card or QR). The bank later
 * posts a signed callback to `/public/banking/bbl/webhook`, which is the only
 * thing that can mark the order paid. No card data ever reaches Lumio.
 *
 * Plain REST form encoding, no SDK, and the merchant credentials belong to the
 * shop (entered in the admin), so every branch is testable with a stub `fetch`.
 */

export const BBL_PAYMENT_PATH = '/v1/payments';
export const BBL_WEBHOOK_ROUTE = '/api/v1/public/banking/bbl/webhook';

/** The bank allows five minutes of clock drift on callback signatures. */
export const BBL_SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

export interface BblPaymentRequest {
  siteId: string;
  orderNumber: string;
  orderToken: string;
  /** Amount in satang; the bank wants decimal baht. */
  amount: number;
  customerEmail: string | null;
  description: string;
  /** Public origin of the shop, where the buyer comes back. */
  publicUrl: string;
  /** Public origin of the API, where the bank posts the callback. */
  apiUrl: string;
}

export interface BblPaymentSession {
  id: string;
  url: string;
}

const withoutTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

export const buildBblPaymentBody = (
  request: BblPaymentRequest,
  config: BblConfig,
): URLSearchParams => {
  const shop = withoutTrailingSlash(request.publicUrl);
  const api = withoutTrailingSlash(request.apiUrl);
  const returnUrl = `${shop}/order/${encodeURIComponent(request.orderToken)}`;

  const body = new URLSearchParams();
  body.set('merchantId', config.clientId);
  body.set('reference', request.orderNumber);
  body.set('amount', (request.amount / 100).toFixed(2));
  body.set('currency', 'THB');
  body.set('description', request.description.slice(0, 200));
  body.set('returnUrl', `${returnUrl}?paid=1`);
  body.set('cancelUrl', `${returnUrl}?cancelled=1`);
  body.set('notifyUrl', `${api}${BBL_WEBHOOK_ROUTE}`);
  body.set('metadata[siteId]', request.siteId);
  body.set('metadata[orderNumber]', request.orderNumber);
  body.set('metadata[orderToken]', request.orderToken);
  body.append('paymentMethods[]', 'card');
  body.append('paymentMethods[]', 'qr');
  if (request.customerEmail) body.set('customerEmail', request.customerEmail);
  return body;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const readString = (record: Record<string, unknown>, keys: readonly string[]): string => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return '';
};

export const parseBblPaymentSession = (payload: unknown): BblPaymentSession | null => {
  const record = asRecord(payload);
  const data = asRecord(record.data);
  const source = Object.keys(data).length > 0 ? data : record;
  const id = readString(source, ['paymentId', 'id', 'transactionId', 'paymentReference']);
  const url = readString(source, ['redirectUrl', 'paymentUrl', 'url', 'checkoutUrl']);
  return id.length > 0 && url.length > 0 ? { id, url } : null;
};

const postAuthorized = async (
  fetchImpl: typeof fetch,
  config: BblConfig,
  url: string,
  body: URLSearchParams,
): Promise<Response> => {
  const send = async (token: string): Promise<Response> => {
    try {
      return await fetchImpl(url, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${token}`,
          'content-type': 'application/x-www-form-urlencoded',
          ...(config.apiKey ? { 'x-api-key': config.apiKey } : {}),
        },
        body,
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw ApiException.conflict('ติดต่อ Payment Gateway ของธนาคารกรุงเทพไม่ได้ ลองอีกครั้ง');
    }
  };

  let response = await send(await bblAccessToken(fetchImpl, config));
  if (response.status === 401) {
    resetBblTokenCache();
    response = await send(await bblAccessToken(fetchImpl, config));
  }
  return response;
};

export const createBblPayment = async (
  fetchImpl: typeof fetch,
  request: BblPaymentRequest,
  config: BblConfig,
): Promise<BblPaymentSession> => {
  if (config.clientId.length === 0 || config.clientSecret.length === 0) {
    throw ApiException.conflict('ร้านนี้ยังไม่ได้กรอกข้อมูล Payment Gateway ของธนาคารกรุงเทพ');
  }
  if (request.amount <= 0) {
    throw ApiException.validation('ยอดชำระต้องมากกว่าศูนย์');
  }

  const response = await postAuthorized(
    fetchImpl,
    config,
    `${config.baseUrl}${BBL_PAYMENT_PATH}`,
    buildBblPaymentBody(request, config),
  );
  if (!response.ok) {
    throw ApiException.conflict('ธนาคารกรุงเทพสร้างหน้าชำระเงินไม่สำเร็จ ลองอีกครั้ง');
  }

  const session = parseBblPaymentSession(await response.json().catch(() => null));
  if (!session) {
    throw ApiException.conflict('ธนาคารกรุงเทพตอบกลับไม่ครบ ลองอีกครั้ง');
  }
  return session;
};

/* ------------------------------------------------------------------ callback */

/**
 * Verifies the `X-BBL-Signature: t=<unix>,v1=<hex>` header over the exact bytes
 * the bank sent. A forged callback can never mark an order paid: the signature,
 * the timestamp and the per-shop secret must all match before parsing.
 */
export const verifyBblWebhook = (
  payload: string | Buffer,
  header: string | undefined,
  secret: string,
  nowMs: number = Date.now(),
): BblWebhookEvent => {
  if (secret.length === 0) {
    throw ApiException.conflict(
      'ร้านนี้ยังไม่ได้ตั้งค่า Webhook Secret ของธนาคารกรุงเทพ จึงยืนยันการชำระเงินไม่ได้',
    );
  }
  if (!header) throw ApiException.unauthorized('คำขอไม่ผ่านการตรวจสอบจากธนาคาร');

  let timestamp = Number.NaN;
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const [key, value] = part.trim().split('=', 2);
    if (key === 't' && value) timestamp = Number(value);
    if (key === 'v1' && value) signatures.push(value);
  }
  if (!Number.isFinite(timestamp) || signatures.length === 0) {
    throw ApiException.unauthorized('ลายเซ็นจากธนาคารไม่ครบถ้วน');
  }
  if (Math.abs(nowMs / 1000 - timestamp) > BBL_SIGNATURE_TOLERANCE_SECONDS) {
    throw ApiException.unauthorized('ลายเซ็นจากธนาคารหมดอายุ');
  }

  const raw = payload.toString();
  const expected = createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex');
  const matched = signatures.some((signature) => {
    const provided = Buffer.from(signature);
    const wanted = Buffer.from(expected);
    return provided.length === wanted.length && timingSafeEqual(provided, wanted);
  });
  if (!matched) throw ApiException.unauthorized('ลายเซ็นจากธนาคารไม่ถูกต้อง');

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw ApiException.validation('เนื้อหาการแจ้งเตือนอ่านไม่ได้');
  }
  return bblWebhookEventSchema.parse(parsed);
};

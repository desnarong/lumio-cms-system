import { ApiException } from '../../common/api-error';
import { stripeSecretKey } from '../billing/stripe';

/**
 * Stripe Connect for shop sellers (docs/design/03-scope.md 3.3). The platform
 * owns the Stripe account; each shop connects an Express account that receives
 * its share. Plain REST requests keep the integration testable with a stub
 * `fetch`, exactly like the rest of the billing code.
 */

const STRIPE_ACCOUNTS = 'https://api.stripe.com/v1/accounts';
const STRIPE_ACCOUNT_LINKS = 'https://api.stripe.com/v1/account_links';
const STRIPE_TRANSFERS = 'https://api.stripe.com/v1/transfers';

const formPost = async (
  fetchImpl: typeof fetch,
  url: string,
  body: URLSearchParams,
  key: string,
  failure: string,
): Promise<Record<string, unknown>> => {
  if (key.length === 0) {
    throw ApiException.conflict(
      'ยังไม่ได้เชื่อมต่อ Stripe กรุณาตั้งค่า STRIPE_SECRET_KEY ก่อนใช้งาน',
    );
  }

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw ApiException.conflict('ติดต่อ Stripe ไม่ได้ ลองอีกครั้ง');
  }

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok || !payload) {
    const message =
      payload && typeof payload.error === 'object' && payload.error !== null
        ? String((payload.error as Record<string, unknown>).message ?? failure)
        : failure;
    throw ApiException.conflict(message.slice(0, 200));
  }
  return payload;
};

export const createConnectAccount = async (
  fetchImpl: typeof fetch,
  request: { siteId: string; email: string | null; country?: string },
  key: string = stripeSecretKey(),
): Promise<string> => {
  const body = new URLSearchParams();
  body.set('type', 'express');
  body.set('country', request.country ?? 'TH');
  if (request.email) body.set('email', request.email);
  body.set('capabilities[transfers][requested]', 'true');
  body.set('metadata[siteId]', request.siteId);
  body.set('business_profile[product_description]', 'สินค้าจากร้านค้าออนไลน์');

  const payload = await formPost(
    fetchImpl,
    STRIPE_ACCOUNTS,
    body,
    key,
    'Stripe สร้างบัญชีรับเงินไม่สำเร็จ',
  );
  if (typeof payload.id !== 'string') {
    throw ApiException.conflict('Stripe ตอบกลับไม่ครบ ลองอีกครั้ง');
  }
  return payload.id;
};

export const createConnectAccountLink = async (
  fetchImpl: typeof fetch,
  request: { accountId: string; refreshUrl: string; returnUrl: string },
  key: string = stripeSecretKey(),
): Promise<string> => {
  const body = new URLSearchParams();
  body.set('account', request.accountId);
  body.set('refresh_url', request.refreshUrl);
  body.set('return_url', request.returnUrl);
  body.set('type', 'account_onboarding');

  const payload = await formPost(
    fetchImpl,
    STRIPE_ACCOUNT_LINKS,
    body,
    key,
    'Stripe สร้างลิงก์เชื่อมบัญชีไม่สำเร็จ',
  );
  if (typeof payload.url !== 'string') {
    throw ApiException.conflict('Stripe ตอบกลับไม่ครบ ลองอีกครั้ง');
  }
  return payload.url;
};

export interface ConnectAccountState {
  id: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

export const fetchConnectAccount = async (
  fetchImpl: typeof fetch,
  accountId: string,
  key: string = stripeSecretKey(),
): Promise<ConnectAccountState> => {
  if (key.length === 0) {
    throw ApiException.conflict(
      'ยังไม่ได้เชื่อมต่อ Stripe กรุณาตั้งค่า STRIPE_SECRET_KEY ก่อนใช้งาน',
    );
  }

  let response: Response;
  try {
    response = await fetchImpl(`${STRIPE_ACCOUNTS}/${encodeURIComponent(accountId)}`, {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw ApiException.conflict('ติดต่อ Stripe ไม่ได้ ลองอีกครั้ง');
  }
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok || !payload || typeof payload.id !== 'string') {
    throw ApiException.conflict('อ่านสถานะบัญชีรับเงินไม่สำเร็จ ลองอีกครั้ง');
  }

  return {
    id: payload.id,
    chargesEnabled: payload.charges_enabled === true,
    payoutsEnabled: payload.payouts_enabled === true,
  };
};

export interface ConnectTransferRequest {
  accountId: string;
  /** Seller share in satang, after the platform commission. */
  amount: number;
  orderNumber: string;
  currency?: string;
}

export const createConnectTransfer = async (
  fetchImpl: typeof fetch,
  request: ConnectTransferRequest,
  key: string = stripeSecretKey(),
): Promise<string> => {
  if (request.amount <= 0) {
    throw ApiException.conflict('ยอดโอนให้ผู้ขายต้องมากกว่าศูนย์');
  }
  const body = new URLSearchParams();
  body.set('amount', String(Math.round(request.amount)));
  body.set('currency', request.currency ?? 'thb');
  body.set('destination', request.accountId);
  body.set('transfer_group', request.orderNumber);
  body.set('metadata[orderNumber]', request.orderNumber);

  const payload = await formPost(
    fetchImpl,
    STRIPE_TRANSFERS,
    body,
    key,
    'Stripe โอนเงินให้ผู้ขายไม่สำเร็จ',
  );
  if (typeof payload.id !== 'string') {
    throw ApiException.conflict('Stripe ตอบกลับไม่ครบ ลองอีกครั้ง');
  }
  return payload.id;
};

/** Seller share after the platform commission, rounded down to a satang. */
export const sellerShare = (total: number, platformFeePercent: number): number =>
  Math.max(0, Math.floor(total * (1 - platformFeePercent / 100)));

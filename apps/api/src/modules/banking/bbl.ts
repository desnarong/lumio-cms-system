import type { BblTransfer, BankMode, BankVerification } from '@lumio/shared';
import { BBL_CLOCK_SKEW_MS, BBL_TRANSFER_WINDOW_MS, matchBblTransfer } from '@lumio/shared';
import { ApiException } from '../../common/api-error';

/**
 * Bangkok Bank (BBL) payment API client (docs/design/03-scope.md 3.3).
 *
 * Credentials belong to the shop, not to the installation: the owner pastes the
 * Client ID/Secret their bank issued into the admin, the API stores the secret
 * encrypted, and every call is made with that shop's own token. Nothing in this
 * file reads `.env`, which keeps the operator out of a customer's bank setup.
 *
 * Everything is plain REST over OAuth 2.0 client credentials, so there is no
 * SDK to pin and every path is testable with a stub `fetch`.
 */

export interface BblConfig {
  baseUrl: string;
  tokenPath: string;
  transferPath: string;
  clientId: string;
  clientSecret: string;
  /** Optional per-application key BBL adds to every request. */
  apiKey: string;
  scope: string;
  sandbox: boolean;
}

export interface BblCredentials {
  clientId: string;
  clientSecret: string;
  apiKey?: string;
  /** Empty uses the bank's default host for the selected mode. */
  baseUrl?: string;
  sandbox?: boolean;
}

export const BBL_DEFAULT_BASE_URL = 'https://api.bangkokbank.com';
export const BBL_SANDBOX_BASE_URL = 'https://sandbox.api.bangkokbank.com';
export const BBL_TOKEN_PATH = '/v1/oauth/token';
export const BBL_TRANSFER_PATH = '/v1/payments/transactions';
export const BBL_TOKEN_SCOPE = 'payment.read';

const withoutTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

export const bblBaseUrl = (credentials: Pick<BblCredentials, 'baseUrl' | 'sandbox'>): string => {
  const custom = withoutTrailingSlash((credentials.baseUrl ?? '').trim());
  if (custom.length > 0) return custom;
  return credentials.sandbox === true ? BBL_SANDBOX_BASE_URL : BBL_DEFAULT_BASE_URL;
};

/** Builds the client config from a shop's stored settings (secret already decrypted). */
export const bblConfigFor = (credentials: BblCredentials): BblConfig => ({
  baseUrl: bblBaseUrl(credentials),
  tokenPath: BBL_TOKEN_PATH,
  transferPath: BBL_TRANSFER_PATH,
  clientId: credentials.clientId.trim(),
  clientSecret: credentials.clientSecret,
  apiKey: (credentials.apiKey ?? '').trim(),
  scope: BBL_TOKEN_SCOPE,
  sandbox: credentials.sandbox === true,
});

export const bblConfigured = (config: BblConfig): boolean =>
  config.clientId.length > 0 && config.clientSecret.length > 0;

export const bblMode = (config: BblConfig): BankMode => {
  if (!bblConfigured(config)) return 'not_configured';
  return config.sandbox ? 'sandbox' : 'live';
};

const configuredOrThrow = (config: BblConfig): void => {
  if (!bblConfigured(config)) {
    throw ApiException.conflict(
      'ร้านนี้ยังไม่ได้กรอก Client ID และ Client Secret ของธนาคารกรุงเทพ',
    );
  }
};

const authHeaders = (config: BblConfig, accessToken?: string): Record<string, string> => ({
  accept: 'application/json',
  ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
  ...(config.apiKey ? { 'x-api-key': config.apiKey } : {}),
});

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const readJson = async (response: Response): Promise<unknown> => {
  const parsed: unknown = await response.json().catch(() => null);
  return parsed;
};

/* --------------------------------------------------------------------- token */

export interface BblToken {
  accessToken: string;
  /** Epoch milliseconds; the cache refreshes a minute early. */
  expiresAt: number;
}

let cachedToken: BblToken | null = null;

/** Tests and credential changes both need a cold cache. */
export const resetBblTokenCache = (): void => {
  cachedToken = null;
};

export const fetchBblToken = async (
  fetchImpl: typeof fetch,
  config: BblConfig,
  now: number = Date.now(),
): Promise<BblToken> => {
  configuredOrThrow(config);

  const body = new URLSearchParams({ grant_type: 'client_credentials', scope: config.scope });
  const basic = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

  let response: Response;
  try {
    response = await fetchImpl(`${config.baseUrl}${config.tokenPath}`, {
      method: 'POST',
      headers: {
        ...authHeaders(config),
        authorization: `Basic ${basic}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw ApiException.conflict('ติดต่อ API ธนาคารกรุงเทพไม่ได้ ลองอีกครั้ง');
  }

  if (!response.ok) {
    throw ApiException.conflict(
      'ธนาคารกรุงเทพไม่อนุมัติการเชื่อมต่อ กรุณาตรวจสอบ Client ID และ Secret',
    );
  }

  const payload = asRecord(await readJson(response));
  const accessToken = typeof payload.access_token === 'string' ? payload.access_token : '';
  if (accessToken.length === 0) {
    throw ApiException.conflict('ธนาคารกรุงเทพตอบกลับไม่ครบ ลองอีกครั้ง');
  }
  const expiresIn =
    typeof payload.expires_in === 'number' && Number.isFinite(payload.expires_in)
      ? payload.expires_in
      : 900;

  return { accessToken, expiresAt: now + Math.max(expiresIn, 60) * 1000 };
};

export const bblAccessToken = async (
  fetchImpl: typeof fetch,
  config: BblConfig,
  now: number = Date.now(),
): Promise<string> => {
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) return cachedToken.accessToken;
  cachedToken = await fetchBblToken(fetchImpl, config, now);
  return cachedToken.accessToken;
};

/* ----------------------------------------------------------------- transfers */

/** Decimal baht from the bank ("1,290.50") to integer satang. */
export const satangFromBankAmount = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.round(value * 100);
  }
  if (typeof value !== 'string') return null;
  const clean = value.replace(/[,\s฿]/g, '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(clean)) return null;
  const [whole = '', fraction = ''] = clean.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
};

const pick = (record: Record<string, unknown>, keys: readonly string[]): unknown => {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
};

const pickString = (record: Record<string, unknown>, keys: readonly string[]): string => {
  const value = pick(record, keys);
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};

/**
 * Maps one statement line to our shape. BBL names the same field differently per
 * product (`reference` / `transactionReference` / `ref`), so all aliases are read
 * here and a line missing a reference, amount, account or timestamp is dropped.
 */
export const parseBblTransfer = (value: unknown): BblTransfer | null => {
  const record = asRecord(value);
  const reference = pickString(record, [
    'reference',
    'transactionReference',
    'ref',
    'transactionId',
  ]);
  const receiverAccount = pickString(record, [
    'receiverAccount',
    'toAccount',
    'creditAccount',
    'accountNumber',
  ]);
  const amount = satangFromBankAmount(
    pick(record, ['amount', 'transferAmount', 'creditAmount', 'paidAmount']),
  );
  const receivedAt = pickString(record, [
    'receivedAt',
    'transactionDate',
    'transactionDateTime',
    'timestamp',
    'valueDate',
  ]);
  const when = new Date(receivedAt);
  if (
    reference.length === 0 ||
    receiverAccount.length === 0 ||
    amount === null ||
    receivedAt.length === 0 ||
    Number.isNaN(when.getTime())
  ) {
    return null;
  }

  const senderName = pickString(record, ['senderName', 'fromName', 'payerName']);
  const senderAccount = pickString(record, ['senderAccount', 'fromAccount', 'debitAccount']);
  const channel = pickString(record, ['channel', 'transactionChannel', 'source']);

  return {
    reference,
    amount,
    receivedAt: when.toISOString(),
    receiverAccount,
    senderName: senderName || null,
    senderAccount: senderAccount || null,
    channel: channel || null,
  };
};

const transfersFrom = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  for (const key of ['transactions', 'items', 'results', 'data']) {
    const value = record[key];
    if (Array.isArray(value)) return value;
    if (value !== null && typeof value === 'object') {
      const nested = transfersFrom(value);
      if (nested.length > 0) return nested;
    }
  }
  return [];
};

export interface BblLookupQuery {
  accountNumber: string;
  reference?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}

export const buildBblTransferUrl = (config: BblConfig, query: BblLookupQuery): string => {
  const url = new URL(`${config.baseUrl}${config.transferPath}`);
  url.searchParams.set('accountNumber', query.accountNumber);
  if (query.reference) url.searchParams.set('reference', query.reference);
  if (query.from) url.searchParams.set('from', query.from.toISOString());
  if (query.to) url.searchParams.set('to', query.to.toISOString());
  url.searchParams.set('limit', String(Math.min(Math.max(query.limit ?? 50, 1), 100)));
  return url.toString();
};

const authorizedGet = async (
  fetchImpl: typeof fetch,
  config: BblConfig,
  url: string,
): Promise<Response> => {
  const send = async (token: string): Promise<Response> =>
    fetchImpl(url, {
      method: 'GET',
      headers: authHeaders(config, token),
      signal: AbortSignal.timeout(15_000),
    });

  try {
    let response = await send(await bblAccessToken(fetchImpl, config));
    // A cached token may have been revoked; one fresh retry is enough.
    if (response.status === 401) {
      resetBblTokenCache();
      response = await send(await bblAccessToken(fetchImpl, config));
    }
    return response;
  } catch {
    throw ApiException.conflict('ติดต่อ API ธนาคารกรุงเทพไม่ได้ ลองอีกครั้ง');
  }
};

export const lookupBblTransfers = async (
  fetchImpl: typeof fetch,
  query: BblLookupQuery,
  config: BblConfig,
): Promise<BblTransfer[]> => {
  configuredOrThrow(config);

  const response = await authorizedGet(fetchImpl, config, buildBblTransferUrl(config, query));
  if (!response.ok) {
    throw ApiException.conflict('ธนาคารกรุงเทพไม่สามารถดึงรายการโอนได้ ลองอีกครั้ง');
  }

  const payload = await readJson(response);
  return transfersFrom(payload)
    .map(parseBblTransfer)
    .filter((entry): entry is BblTransfer => entry !== null);
};

/* -------------------------------------------------------------- verification */

export interface BblVerificationRequest {
  accountNumber: string;
  reference: string;
  /** Exact order total in satang. */
  amount: number;
}

/**
 * The buyer's answer must never depend on the bank being reachable: an outage
 * returns `unavailable`, which keeps the slip for the shop to review instead of
 * rejecting money that may already have arrived.
 */
export const verifyBblTransfer = async (
  fetchImpl: typeof fetch,
  request: BblVerificationRequest,
  config: BblConfig,
  now: Date = new Date(),
): Promise<BankVerification> => {
  if (!bblConfigured(config)) {
    return {
      status: 'unavailable',
      matched: false,
      message: 'ร้านยังไม่ได้เชื่อมต่อ API ธนาคารกรุงเทพ',
      transfer: null,
    };
  }

  let transfers: BblTransfer[];
  try {
    transfers = await lookupBblTransfers(
      fetchImpl,
      {
        accountNumber: request.accountNumber,
        reference: request.reference,
        from: new Date(now.getTime() - BBL_TRANSFER_WINDOW_MS),
        to: new Date(now.getTime() + BBL_CLOCK_SKEW_MS),
        limit: 20,
      },
      config,
    );
  } catch {
    return {
      status: 'unavailable',
      matched: false,
      message: 'ตรวจสอบกับธนาคารไม่สำเร็จ ระบบเก็บสลิปไว้ให้ร้านตรวจสอบ',
      transfer: null,
    };
  }

  const match = transfers.find((transfer) => matchBblTransfer(transfer, request, now).matched);
  if (match) {
    return {
      status: 'verified',
      matched: true,
      message: 'ธนาคารยืนยันว่าได้รับเงินจำนวนนี้เข้าบัญชีของร้านแล้ว',
      transfer: match,
    };
  }

  return {
    status: 'pending_review',
    matched: false,
    message:
      transfers.length > 0
        ? 'พบรายการโอนแต่ยอดเงินหรือเลขอ้างอิงไม่ตรงกับคำสั่งซื้อ ร้านจะตรวจสอบอีกครั้ง'
        : 'ยังไม่พบรายการโอนที่ตรงกับสลิปนี้ในระบบธนาคาร ร้านจะตรวจสอบอีกครั้ง',
    transfer: null,
  };
};

/** Cheap credential check used by the admin "ทดสอบการเชื่อมต่อ" button. */
export const checkBblConnection = async (
  fetchImpl: typeof fetch,
  config: BblConfig,
): Promise<BankMode> => {
  configuredOrThrow(config);
  resetBblTokenCache();
  await fetchBblToken(fetchImpl, config);
  return bblMode(config);
};

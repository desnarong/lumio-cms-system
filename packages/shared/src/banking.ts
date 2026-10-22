import { z } from 'zod';
import { ORDER_STATUSES } from './commerce.js';

/**
 * Automatic payment verification with a Thai bank (docs/design/03-scope.md 3.3).
 * The shop owner links the account that receives the transfers and enters the
 * credentials their bank issued *in the admin*, so a non-technical owner never
 * touches `.env`. Credentials are encrypted at rest by the API and the secret is
 * write-only: it is accepted by `PATCH /banking/bbl` and never returned.
 *
 * Only Bangkok Bank (BBL) is supported for now. Everything bank-specific lives
 * in `BANK_PROVIDERS`, so adding another bank is a new value plus one client.
 */

export const BANK_PROVIDERS = ['bbl'] as const;
export type BankProvider = (typeof BANK_PROVIDERS)[number];

export const isBankProvider = (value: unknown): value is BankProvider =>
  typeof value === 'string' && (BANK_PROVIDERS as readonly string[]).includes(value);

/** `not_configured` means the shop has not entered its API credentials yet. */
export const BANK_MODES = ['live', 'sandbox', 'not_configured'] as const;
export type BankMode = (typeof BANK_MODES)[number];

/** Bangkok Bank account numbers are ten digits; the branch is part of them. */
export const BBL_ACCOUNT_PATTERN = /^\d{10}$/;

export const isBblAccountNumber = (value: string): boolean =>
  BBL_ACCOUNT_PATTERN.test(value.trim());

/** Shown in the admin and in audit logs, never the full account number. */
export const maskAccountNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 3)}${'x'.repeat(digits.length - 6)}${digits.slice(-3)}`;
};

/* ------------------------------------------------------------------ settings */

/**
 * Credentials leave the browser only over https; an empty value means "use the
 * bank's default host for the selected mode".
 */
const baseUrlSchema = z
  .string()
  .trim()
  .max(300)
  .refine(
    (value) => value.length === 0 || /^https:\/\/[^\s]+$/i.test(value),
    'ที่อยู่ API ของธนาคารต้องขึ้นต้นด้วย https://',
  );

export const bankSettingsSchema = z.object({
  provider: z.literal('bbl').default('bbl'),
  /** The BBL account that receives the shop's transfers. */
  accountNumber: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z
      .string()
      .trim()
      .regex(BBL_ACCOUNT_PATTERN, 'เลขบัญชีธนาคารกรุงเทพต้องเป็นตัวเลข 10 หลัก')
      .nullable()
      .default(null),
  ),
  /** Name on the account, printed on the receipt and shown to the buyer. */
  accountName: z.string().trim().max(120).default(''),
  /** Ask the bank about every uploaded slip before confirming an order. */
  autoVerifySlips: z.boolean().default(true),
  /** Client ID from the shop's own Bangkok Bank API application. */
  clientId: z.string().trim().max(200).default(''),
  /** AES-256-GCM envelope written by the API; never returned to the browser. */
  clientSecret: z.string().max(4096).default(''),
  /** Optional per-application key, also stored encrypted. */
  apiKey: z.string().max(4096).default(''),
  /** HMAC key the bank signs payment callbacks with, also stored encrypted. */
  webhookSecret: z.string().max(4096).default(''),
  /** Empty uses the bank's own host; override only when BBL assigns one. */
  baseUrl: baseUrlSchema.default(''),
  sandbox: z.boolean().default(false),
  /** Written by the server once an account is linked. */
  connectedAt: z.string().nullable().default(null),
  connectedBy: z.string().nullable().default(null),
  lastCheckedAt: z.string().nullable().default(null),
});
export type BankSettings = z.infer<typeof bankSettingsSchema>;

export const readBankSettings = (value: unknown): BankSettings => {
  const parsed = bankSettingsSchema.safeParse(
    value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {},
  );
  return parsed.success ? parsed.data : bankSettingsSchema.parse({});
};

/**
 * A shop can ask the bank only when it stored both halves of the credential
 * pair. The secret is a ciphertext at this point; emptiness is what matters.
 */
export const bankCredentialsReady = (
  settings: Pick<BankSettings, 'clientId' | 'clientSecret'>,
): boolean => settings.clientId.length > 0 && settings.clientSecret.length > 0;

/** A gateway payment also needs the bank's callback key, or a paid order stays pending. */
export const bblGatewayReady = (
  settings: Pick<BankSettings, 'clientId' | 'clientSecret' | 'webhookSecret'>,
): boolean => bankCredentialsReady(settings) && settings.webhookSecret.length > 0;

/** Connection fields are written by the API flow only, never by a settings form. */
export const updateBankSettingsInputSchema = bankSettingsSchema
  .omit({
    provider: true,
    clientSecret: true,
    apiKey: true,
    webhookSecret: true,
    connectedAt: true,
    connectedBy: true,
    lastCheckedAt: true,
  })
  .partial()
  .extend({
    /** Plain secret from the form; omitted keeps the stored one. */
    clientSecret: z
      .string()
      .trim()
      .min(8, 'Client Secret ต้องยาวอย่างน้อย 8 ตัวอักษร')
      .max(500)
      .optional(),
    /** `null` (or "") removes the key; omitted keeps the stored one. */
    apiKey: z.string().trim().max(500).nullable().optional(),
    /** Plain callback key from the form; omitted keeps the stored one. */
    webhookSecret: z
      .string()
      .trim()
      .min(8, 'Webhook Secret ต้องยาวอย่างน้อย 8 ตัวอักษร')
      .max(500)
      .optional(),
  });
export type UpdateBankSettingsInput = z.infer<typeof updateBankSettingsInputSchema>;

export const bankConnectionSchema = z.object({
  provider: z.literal('bbl'),
  /** True only when credentials and a receiving account are both stored. */
  connected: z.boolean(),
  mode: z.enum(BANK_MODES),
  /** Masked so the admin screen never prints the full number. */
  accountNumber: z.string().nullable(),
  accountName: z.string(),
  autoVerifySlips: z.boolean(),
  /** Safe to show: the bank treats the client id as an identifier, not a secret. */
  clientId: z.string(),
  hasClientSecret: z.boolean(),
  hasWebhookSecret: z.boolean(),
  apiKeySet: z.boolean(),
  baseUrl: z.string(),
  sandbox: z.boolean(),
  connectedAt: z.string().nullable(),
  lastCheckedAt: z.string().nullable(),
  message: z.string(),
});
export type BankConnection = z.infer<typeof bankConnectionSchema>;

/* ----------------------------------------------------------------- transfers */

export const bblTransferSchema = z.object({
  /** Bank transaction reference, the key a slip is matched on. */
  reference: z.string(),
  /** Integer satang, converted from the bank's decimal baht amount. */
  amount: z.number().int().nonnegative(),
  receivedAt: z.string(),
  receiverAccount: z.string(),
  senderName: z.string().nullable(),
  senderAccount: z.string().nullable(),
  channel: z.string().nullable(),
});
export type BblTransfer = z.infer<typeof bblTransferSchema>;

export const bblTransferQuerySchema = z.object({
  /** ISO date-time; defaults to the last 24 hours on the server. */
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type BblTransferQuery = z.infer<typeof bblTransferQuerySchema>;

/** Callback the bank sends after a buyer pays on its hosted page. */
export const BBL_WEBHOOK_STATUSES = ['paid', 'failed', 'cancelled'] as const;
export type BblWebhookStatus = (typeof BBL_WEBHOOK_STATUSES)[number];

export const bblWebhookEventSchema = z.object({
  /** Which shop the payment belongs to; it selects the secret used to verify. */
  siteId: z.string().uuid(),
  paymentId: z.string().trim().min(1).max(200),
  orderNumber: z.string().trim().max(40).nullable().optional(),
  status: z.enum(BBL_WEBHOOK_STATUSES),
  /** Paid amount in satang, checked against the order total. */
  amount: z.number().int().min(0),
  paidAt: z.string().datetime().nullable().optional(),
  transactionId: z.string().trim().max(200).nullable().optional(),
});
export type BblWebhookEvent = z.infer<typeof bblWebhookEventSchema>;

export interface BblTransferList {
  provider: BankProvider;
  accountNumber: string | null;
  items: BblTransfer[];
}

/* --------------------------------------------------------------- verification */

export const BANK_VERIFICATION_STATUSES = ['verified', 'pending_review', 'unavailable'] as const;
export type BankVerificationStatus = (typeof BANK_VERIFICATION_STATUSES)[number];

export const bankVerificationSchema = z.object({
  status: z.enum(BANK_VERIFICATION_STATUSES),
  matched: z.boolean(),
  /** Thai sentence safe to show a buyer or a shop owner. */
  message: z.string(),
  transfer: bblTransferSchema.nullable(),
});
export type BankVerification = z.infer<typeof bankVerificationSchema>;

/** Admin answer after re-checking one order's slip with the bank. */
export const slipVerificationSchema = bankVerificationSchema.extend({
  orderId: z.string(),
  slipId: z.string().nullable(),
  orderStatus: z.enum(ORDER_STATUSES),
});
export type SlipVerification = z.infer<typeof slipVerificationSchema>;

/** A transfer older than this is not accepted for an order placed today. */
export const BBL_TRANSFER_WINDOW_MS = 72 * 60 * 60 * 1000;

/** Banks keep their own clock; allow a few minutes of drift. */
export const BBL_CLOCK_SKEW_MS = 5 * 60 * 1000;

export const normalizeBankReference = (value: string): string =>
  value.replace(/[\s-]/g, '').toUpperCase();

/**
 * Compares the last four digits when either side is masked, and the full ten
 * digits otherwise, so a masked statement line still matches the linked account.
 */
const sameAccount = (left: string, right: string): boolean => {
  const a = left.replace(/\D/g, '');
  const b = right.replace(/\D/g, '');
  if (a.length === 0 || b.length === 0) return false;
  if (a.length >= 10 && b.length >= 10) return a === b;
  const tail = Math.min(a.length, b.length, 4);
  return tail > 0 && a.slice(-tail) === b.slice(-tail);
};

export type BblMismatchReason = 'account' | 'amount' | 'reference' | 'time';

export interface BblMatchResult {
  matched: boolean;
  /** The first rule that rejected the transfer, `null` when it matched. */
  reason: BblMismatchReason | null;
}

export const bblMismatchMessage: Record<BblMismatchReason, string> = {
  account: 'บัญชีปลายทางไม่ใช่บัญชีที่ร้านผูกไว้',
  amount: 'ยอดเงินในรายการโอนไม่ตรงกับคำสั่งซื้อ',
  reference: 'เลขอ้างอิงของรายการโอนไม่ตรงกับสลิป',
  time: 'รายการโอนอยู่นอกช่วงเวลาที่ตรวจสอบได้',
};

/**
 * One transfer is evidence for an order only when all four facts line up:
 * money arrived in the linked account, the amount is exact, the reference is
 * the one on the slip, and the transfer is recent.
 */
export const matchBblTransfer = (
  transfer: BblTransfer,
  expected: { accountNumber: string; reference: string; amount: number },
  now: Date = new Date(),
): BblMatchResult => {
  if (!sameAccount(transfer.receiverAccount, expected.accountNumber)) {
    return { matched: false, reason: 'account' };
  }
  if (transfer.amount !== expected.amount) {
    return { matched: false, reason: 'amount' };
  }
  if (normalizeBankReference(transfer.reference) !== normalizeBankReference(expected.reference)) {
    return { matched: false, reason: 'reference' };
  }
  const received = new Date(transfer.receivedAt).getTime();
  if (
    !Number.isFinite(received) ||
    received < now.getTime() - BBL_TRANSFER_WINDOW_MS ||
    received > now.getTime() + BBL_CLOCK_SKEW_MS
  ) {
    return { matched: false, reason: 'time' };
  }
  return { matched: true, reason: null };
};

import { z } from 'zod';
import type { ApiLocale } from './api-locale.js';
import { PLANS, type Plan } from './site.js';

/**
 * Plans and billing (docs/design/18-deployment.md 18.6-18.7, 05-admin-ia.md
 * "ตั้งค่า › แพ็กเกจ & การชำระเงิน"). The plan table lives in code so the store,
 * the quota checks and the screen all read one source; usage is measured from the
 * site's own rows.
 */

export const BILLING_CURRENCY = 'THB';

export interface PlanQuota {
  /** Page/post limit, or `null` for unlimited. */
  pages: number | null;
  /** Media storage limit in bytes, or `null` for unlimited. */
  mediaBytes: number | null;
  /** AI actions per month, or `null` when the plan has none. */
  aiPerMonth: number | null;
  /** Team member limit (including the owner), or `null` for unlimited. */
  team: number | null;
}

export interface PlanDefinition {
  id: Plan;
  label: string;
  /** Monthly price in baht, or `null` when the plan is sold by contact. */
  price: number | null;
  quota: PlanQuota;
  features: string[];
}

const MB = 1024 * 1024;
const GB = 1024 * MB;

/** The plans from docs/design/18-deployment.md 18.6-18.7. */
export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    id: 'free',
    label: 'ฟรี',
    price: 0,
    quota: { pages: 3, mediaBytes: 100 * MB, aiPerMonth: null, team: 1 },
    features: ['ที่อยู่เว็บฟรี', '3 หน้า', 'มีโลโก้ Lumio'],
  },
  {
    id: 'starter',
    label: 'เริ่มต้น',
    price: 199,
    quota: { pages: 20, mediaBytes: 2 * GB, aiPerMonth: null, team: 2 },
    features: ['ใช้โดเมนของตัวเอง', '20 หน้า', 'ฟอร์มติดต่อ', 'SEO พื้นฐาน'],
  },
  {
    id: 'pro',
    label: 'โปร',
    price: 499,
    quota: { pages: null, mediaBytes: 20 * GB, aiPerMonth: 200, team: 5 },
    features: ['หน้าไม่จำกัด', 'สถิติผู้เข้าชม', 'ข่าวสาร', 'AI ช่วยเขียน'],
  },
  {
    id: 'business',
    label: 'ธุรกิจ',
    price: 1290,
    quota: { pages: null, mediaBytes: 100 * GB, aiPerMonth: 1000, team: 10 },
    features: ['หลายภาษา', 'ทีมงาน 10 คน', 'E-commerce'],
  },
  {
    id: 'agency',
    label: 'เอเจนซี่',
    price: null,
    quota: { pages: null, mediaBytes: null, aiPerMonth: null, team: null },
    features: ['หลายเว็บ', 'White-label', 'Public API'],
  },
];

export const findPlan = (plan: string): PlanDefinition =>
  PLAN_DEFINITIONS.find((entry) => entry.id === plan) ?? (PLAN_DEFINITIONS[0] as PlanDefinition);

/** Plan names in each UI language, so a screen never mixes them (05-admin-ia.md). */
export const PLAN_LABELS_EN: Record<Plan, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
  agency: 'Agency',
};

const PLAN_FEATURES_EN: Record<Plan, string[]> = {
  free: ['Free web address', '3 pages', 'Lumio logo badge'],
  starter: ['Your own domain', '20 pages', 'Contact form', 'Basic SEO'],
  pro: ['Unlimited pages', 'Visitor analytics', 'Newsletter', 'AI writing help'],
  business: ['Multiple languages', 'Team of 10', 'E-commerce'],
  agency: ['Multiple sites', 'White-label', 'Public API'],
};

export const planLabel = (plan: string, locale: ApiLocale = 'th'): string => {
  const definition = findPlan(plan);
  return locale === 'en' ? PLAN_LABELS_EN[definition.id] : definition.label;
};

/** Plan features in the requested language; `PLAN_DEFINITIONS` stays Thai-first. */
export const planFeatures = (plan: string, locale: ApiLocale = 'th'): string[] =>
  locale === 'en' ? PLAN_FEATURES_EN[findPlan(plan).id] : findPlan(plan).features;

export const isPlan = (value: unknown): value is Plan =>
  typeof value === 'string' && (PLANS as readonly string[]).includes(value);

/** Quota shape the API answers with; `null` means unlimited. */
export const planQuotaSchema = z.object({
  pages: z.number().int().nonnegative().nullable(),
  mediaBytes: z.number().int().nonnegative().nullable(),
  aiPerMonth: z.number().int().nonnegative().nullable(),
  team: z.number().int().nonnegative().nullable(),
});
export type PlanQuotaPayload = z.infer<typeof planQuotaSchema>;

export const planOptionSchema = z.object({
  id: z.enum(PLANS),
  label: z.string(),
  price: z.number().int().nonnegative().nullable(),
  currency: z.string(),
  quota: planQuotaSchema,
  features: z.array(z.string()),
  /** True for the plan the site is on right now. */
  current: z.boolean(),
  /**
   * Unused time on the current plan, applied to this switch
   * (docs/design/18-deployment.md 18.6). Zero for the plan in use.
   */
  credit: z.number().int().nonnegative().default(0),
  /** What the owner actually pays today: `price - credit`, never below zero. */
  payable: z.number().int().nonnegative().nullable(),
});
export type PlanOption = z.infer<typeof planOptionSchema>;

/** What the site is using right now, measured from its own rows. */
export const billingUsageSchema = z.object({
  pages: z.number().int().nonnegative(),
  mediaBytes: z.number().int().nonnegative(),
  team: z.number().int().nonnegative(),
});
export type BillingUsage = z.infer<typeof billingUsageSchema>;

export const INVOICE_STATUSES = ['paid', 'pending', 'void'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  paid: 'ชำระแล้ว',
  pending: 'รอชำระ',
  void: 'ยกเลิก',
};

export const INVOICE_STATUS_LABELS_EN: Record<InvoiceStatus, string> = {
  paid: 'Paid',
  pending: 'Awaiting payment',
  void: 'Cancelled',
};

export const invoiceStatusLabel = (status: InvoiceStatus, locale: ApiLocale = 'th'): string =>
  locale === 'en' ? INVOICE_STATUS_LABELS_EN[status] : INVOICE_STATUS_LABELS[status];

/** How the owner pays: a card, or PromptPay (both run through Stripe). */
export const PAYMENT_METHODS = ['card', 'promptpay'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, { th: string; en: string }> = {
  card: { th: 'บัตรเครดิต / เดบิต', en: 'Credit / debit card' },
  promptpay: { th: 'พร้อมเพย์ (QR)', en: 'PromptPay (QR)' },
};

export const paymentMethodLabel = (method: PaymentMethod, locale: ApiLocale = 'th'): string =>
  locale === 'en' ? PAYMENT_METHOD_LABELS[method].en : PAYMENT_METHOD_LABELS[method].th;

/** "Pay for this plan with this method": both go through Stripe Checkout. */
export const checkoutInputSchema = z.object({
  plan: z.enum(PLANS),
  method: z.enum(PAYMENT_METHODS),
});
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export const checkoutSessionSchema = z.object({
  /** Hosted Stripe page to send the browser to. */
  url: z.string(),
  sessionId: z.string(),
  invoiceId: z.string(),
  method: z.enum(PAYMENT_METHODS),
  /**
   * True when the unused time on the current plan covered the whole switch, so
   * no payment page was opened and the plan is already active.
   */
  paid: z.boolean().default(false),
});
export type CheckoutSession = z.infer<typeof checkoutSessionSchema>;

export const invoiceSchema = z.object({
  id: z.string(),
  plan: z.string(),
  planLabel: z.string(),
  amount: z.number().int().nonnegative(),
  currency: z.string(),
  status: z.enum(INVOICE_STATUSES),
  periodStart: z.string(),
  periodEnd: z.string(),
  issuedAt: z.string(),
  paidAt: z.string().nullable(),
  /** How it was paid; null for invoices issued before the gateway existed. */
  method: z.enum(PAYMENT_METHODS).nullable(),
  /** Unused time on the previous plan taken off this invoice. */
  credit: z.number().int().nonnegative().default(0),
});
export type Invoice = z.infer<typeof invoiceSchema>;

/** The paid plan's auto-renewal state (cards renew; PromptPay does not). */
export const billingSubscriptionSchema = z.object({
  /** Next renewal charge; null when there is nothing scheduled. */
  renewsAt: z.string().nullable(),
  /** True once cancelled; the plan stays until `renewsAt`. */
  cancelAtPeriodEnd: z.boolean(),
  method: z.enum(PAYMENT_METHODS).nullable(),
});
export type BillingSubscription = z.infer<typeof billingSubscriptionSchema>;

export const billingSummarySchema = z.object({
  plan: z.string(),
  planLabel: z.string(),
  price: z.number().int().nonnegative().nullable(),
  currency: z.string(),
  quota: planQuotaSchema,
  usage: billingUsageSchema,
  plans: z.array(planOptionSchema),
  invoices: z.array(invoiceSchema),
  /** Null on the free plan or when the plan was paid once (PromptPay). */
  subscription: billingSubscriptionSchema.nullable(),
});
export type BillingSummary = z.infer<typeof billingSummarySchema>;

export const changePlanInputSchema = z.object({
  plan: z.enum(PLANS),
});
export type ChangePlanInput = z.infer<typeof changePlanInputSchema>;

/** Bytes as a short Thai-friendly label ("2 GB", "480 MB"). */
export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit]}`;
};

/** Price as "฿499 / เดือน", or "ติดต่อฝ่ายขาย" for the contact-only plan. */
export const formatPlanPrice = (price: number | null, locale: ApiLocale = 'th'): string => {
  if (price === null) return locale === 'en' ? 'Contact sales' : 'ติดต่อฝ่ายขาย';
  if (price === 0) return locale === 'en' ? 'Free' : 'ฟรี';
  const amount = price.toLocaleString(locale === 'en' ? 'en-US' : 'th-TH');
  return locale === 'en' ? `฿${amount} / month` : `฿${amount} / เดือน`;
};

/**
 * Percent of a quota used, capped at 100. Unlimited quotas (`null`) report 0 so
 * the screen shows a plain figure instead of a bar.
 */
export const quotaUsedPercent = (used: number, limit: number | null): number => {
  if (limit === null || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
};

/** True when usage has reached or passed the quota. */
export const isOverQuota = (used: number, limit: number | null): boolean =>
  limit !== null && used >= limit;

/** Which plan quota a write is about to exceed. */
export const QUOTA_KINDS = ['pages', 'mediaBytes', 'team'] as const;
export type QuotaKind = (typeof QUOTA_KINDS)[number];

/**
 * Business wording for a full quota (docs/design/18-deployment.md 18.6). The API
 * refuses the write with this line, so the screen never shows a bare 409.
 */
export const quotaExceededMessage = (
  kind: QuotaKind,
  limit: number,
  locale: ApiLocale = 'th',
): string => {
  const en = locale === 'en';
  switch (kind) {
    case 'pages':
      return en
        ? `This plan includes ${limit} pages and they are all used. Remove one or upgrade the plan.`
        : `แพ็กเกจนี้มีได้ ${limit} หน้า ตอนนี้ครบแล้ว ลบหน้าที่ไม่ใช้หรืออัปเกรดแพ็กเกจ`;
    case 'mediaBytes':
      return en
        ? `Media storage is full (${formatBytes(limit)}). Remove unused images or upgrade the plan.`
        : `พื้นที่ไฟล์สื่อเต็มแล้ว (${formatBytes(limit)}) ลบรูปที่ไม่ใช้หรืออัปเกรดแพ็กเกจ`;
    case 'team':
      return en
        ? `This plan includes ${limit} team members and they are all invited. Upgrade the plan to add more.`
        : `แพ็กเกจนี้มีทีมได้ ${limit} คน ตอนนี้ครบแล้ว อัปเกรดแพ็กเกจเพื่อเพิ่มทีม`;
  }
};

/**
 * Unused time on the current plan, in baht (docs/design/18-deployment.md 18.6).
 * Only the remaining part of the paid period counts, so a site that cancels on
 * the last day gets nothing and one that switches on the first day gets nearly
 * the whole month. The result never exceeds what the owner paid.
 */
export const prorationCreditFor = (input: {
  /** What the current plan costs per period, or null when it has no price. */
  price: number | null;
  periodStart: Date;
  periodEnd: Date;
  now?: Date;
}): number => {
  const { price, periodStart, periodEnd, now = new Date() } = input;
  if (price === null || price <= 0) return 0;

  const totalMs = periodEnd.getTime() - periodStart.getTime();
  if (totalMs <= 0) return 0;

  const remainingMs = periodEnd.getTime() - now.getTime();
  if (remainingMs <= 0) return 0;

  const fraction = Math.min(1, remainingMs / totalMs);
  return Math.min(price, Math.floor(price * fraction));
};

/** A switch quote: the credit taken off and what is left to pay today. */
export interface ProrationQuote {
  credit: number;
  /** Null when the plan is sold by contact; zero is a fully covered switch. */
  payable: number | null;
}

export const prorationQuote = (price: number | null, credit: number): ProrationQuote => {
  if (price === null) return { credit: 0, payable: null };
  const applied = Math.min(Math.max(0, Math.floor(credit)), price);
  return { credit: applied, payable: Math.max(0, price - applied) };
};

/** The date range a switch is credited against, when the site has one. */
export interface PaidPeriod {
  start: string;
  end: string;
}

/** Business wording for the credit the owner sees before paying. */
export const prorationNote = (credit: number, locale: ApiLocale = 'th'): string => {
  const amount = `฿${credit.toLocaleString(locale === 'en' ? 'en-US' : 'th-TH')}`;
  return locale === 'en'
    ? `Unused time on your current plan (${amount}) is taken off this payment.`
    : `ส่วนที่เหลือของแพ็กเกจเดิม (${amount}) ถูกหักออกจากยอดที่ต้องชำระครั้งนี้`;
};


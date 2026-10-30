import { z } from 'zod';
import { CONTENT_ACCESS, type ContentAccess } from './content.js';

/**
 * Reader accounts and paid memberships (docs/design/24-community-licensing.md
 * 24.1, `docs/PROGRESS.md` batch A). Readers are not team members: an account
 * belongs to one site and unlocks the pages that site marked members-only.
 *
 * Every price is integer satang, like the shop, so totals never drift.
 */

export const MEMBERSHIP_INTERVALS = ['month', 'year'] as const;
export type MembershipInterval = (typeof MEMBERSHIP_INTERVALS)[number];

export const MEMBERSHIP_PLAN_STATUSES = ['active', 'paused'] as const;
export type MembershipPlanStatus = (typeof MEMBERSHIP_PLAN_STATUSES)[number];

export const READER_SUBSCRIPTION_STATUSES = [
  'active',
  'past_due',
  'cancelled',
  'expired',
] as const;
export type ReaderSubscriptionStatus = (typeof READER_SUBSCRIPTION_STATUSES)[number];

export const isContentAccess = (value: unknown): value is ContentAccess =>
  typeof value === 'string' && (CONTENT_ACCESS as readonly string[]).includes(value);

export const isMembershipInterval = (value: unknown): value is MembershipInterval =>
  typeof value === 'string' && (MEMBERSHIP_INTERVALS as readonly string[]).includes(value);

export const isReaderSubscriptionStatus = (value: unknown): value is ReaderSubscriptionStatus =>
  typeof value === 'string' &&
  (READER_SUBSCRIPTION_STATUSES as readonly string[]).includes(value);

/** Whole days in one billing period, used to extend a subscription. */
export const intervalDays = (interval: MembershipInterval): number =>
  interval === 'year' ? 365 : 30;

/** Thai label for a billing period; screens never print the raw value. */
export const intervalLabel = (interval: MembershipInterval): string =>
  interval === 'year' ? 'รายปี' : 'รายเดือน';

export const intervalLabelEn = (interval: MembershipInterval): string =>
  interval === 'year' ? 'per year' : 'per month';

/** "฿1,290" — satang in, display string out. */
export const formatMembershipPrice = (satang: number, currency = 'THB'): string => {
  const amount = Math.max(0, Math.round(satang)) / 100;
  const formatted = new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return currency === 'THB' ? `฿${formatted}` : `${formatted} ${currency}`;
};

export const membershipPlanInputSchema = z.object({
  name: z.string().trim().min(1, 'กรุณาตั้งชื่อแพ็กเกจ').max(80),
  description: z.string().trim().max(500).default(''),
  interval: z.enum(MEMBERSHIP_INTERVALS),
  /** Price in satang; 0 means the plan is free. */
  price: z
    .number()
    .int()
    .min(0)
    .max(100_000_000, 'ราคาสูงเกินไป'),
  status: z.enum(MEMBERSHIP_PLAN_STATUSES).default('active'),
});
export type MembershipPlanInput = z.infer<typeof membershipPlanInputSchema>;

export const updateMembershipPlanInputSchema = membershipPlanInputSchema.partial();
export type UpdateMembershipPlanInput = z.infer<typeof updateMembershipPlanInputSchema>;

export const membershipPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  interval: z.enum(MEMBERSHIP_INTERVALS),
  price: z.number().int(),
  currency: z.string(),
  status: z.enum(MEMBERSHIP_PLAN_STATUSES),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MembershipPlan = z.infer<typeof membershipPlanSchema>;

/** What the public site shows: no internal ids beyond the plan's own. */
export const publicMembershipPlanSchema = membershipPlanSchema.pick({
  id: true,
  name: true,
  description: true,
  interval: true,
  price: true,
  currency: true,
});
export type PublicMembershipPlan = z.infer<typeof publicMembershipPlanSchema>;

export const publicMembershipPlanListSchema = z.object({
  items: z.array(publicMembershipPlanSchema),
});
export type PublicMembershipPlanList = z.infer<typeof publicMembershipPlanListSchema>;

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('อีเมลไม่ถูกต้อง')
  .max(200);

/** A password a real person can remember without a password manager. */
const passwordSchema = z
  .string()
  .min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
  .max(200, 'รหัสผ่านยาวเกินไป');

export const readerRegisterInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().max(80).optional(),
  /** Hidden field no person fills in; a filled one is dropped silently. */
  honeypot: z.string().max(200).optional(),
});
export type ReaderRegisterInput = z.infer<typeof readerRegisterInputSchema>;

export const readerLoginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน').max(200),
});
export type ReaderLoginInput = z.infer<typeof readerLoginInputSchema>;

/** Always answered with the same message, so addresses cannot be enumerated. */
export const readerForgotPasswordInputSchema = z.object({ email: emailSchema });
export type ReaderForgotPasswordInput = z.infer<typeof readerForgotPasswordInputSchema>;

export const readerResetPasswordInputSchema = z.object({
  token: z.string().trim().min(20).max(200),
  password: passwordSchema,
});
export type ReaderResetPasswordInput = z.infer<typeof readerResetPasswordInputSchema>;

export const readerVerifyEmailInputSchema = z.object({
  token: z.string().trim().min(20).max(200),
});
export type ReaderVerifyEmailInput = z.infer<typeof readerVerifyEmailInputSchema>;

export const readerSubscriptionViewSchema = z.object({
  planId: z.string().nullable(),
  planName: z.string().nullable(),
  interval: z.enum(MEMBERSHIP_INTERVALS).nullable(),
  status: z.enum(READER_SUBSCRIPTION_STATUSES),
  /** ISO date the paid period runs out, or null when unknown. */
  currentPeriodEnd: z.string().nullable(),
  cancelAtPeriodEnd: z.boolean(),
});
export type ReaderSubscriptionView = z.infer<typeof readerSubscriptionViewSchema>;

export const readerSessionSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  emailVerified: z.boolean(),
  subscription: readerSubscriptionViewSchema.nullable(),
});
export type ReaderSession = z.infer<typeof readerSessionSchema>;

/** Signed-in reader plus the bearer token the site stores in a cookie. */
export const readerSessionResponseSchema = z.object({
  token: z.string(),
  reader: readerSessionSchema,
});
export type ReaderSessionResponse = z.infer<typeof readerSessionResponseSchema>;

export const readerListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(READER_SUBSCRIPTION_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type ReaderListQuery = z.infer<typeof readerListQuerySchema>;

export const membershipReaderSchema = readerSessionSchema.extend({
  joinedAt: z.string(),
  subscription: readerSubscriptionViewSchema.nullable(),
});
export type MembershipReader = z.infer<typeof membershipReaderSchema>;

export const membershipReaderListSchema = z.object({
  items: z.array(membershipReaderSchema),
  total: z.number().int(),
});
export type MembershipReaderList = z.infer<typeof membershipReaderListSchema>;

export const membershipSummarySchema = z.object({
  readers: z.number().int(),
  activeMembers: z.number().int(),
  /** Monthly recurring revenue in satang, yearly plans divided by twelve. */
  mrr: z.number().int(),
  currency: z.string(),
  plans: z.number().int(),
});
export type MembershipSummary = z.infer<typeof membershipSummarySchema>;

export const membershipCheckoutInputSchema = z.object({
  planId: z.string().uuid('ไม่พบแพ็กเกจนี้'),
});
export type MembershipCheckoutInput = z.infer<typeof membershipCheckoutInputSchema>;

export const membershipCheckoutSchema = z.object({ url: z.string().url() });
export type MembershipCheckout = z.infer<typeof membershipCheckoutSchema>;

export const publicPaywallSchema = z.object({
  /** True when the page body is withheld and only the teaser is served. */
  locked: z.boolean(),
  /** Plans a visitor can join to read this page (active plans only). */
  plans: z.array(publicMembershipPlanSchema).default([]),
});
export type PublicPaywall = z.infer<typeof publicPaywallSchema>;

export const CANCEL_MEMBERSHIP_INPUT = z.object({ cancel: z.boolean().default(true) });
export type CancelMembershipInput = z.infer<typeof CANCEL_MEMBERSHIP_INPUT>;

export interface SubscriptionState {
  status: ReaderSubscriptionStatus | string;
  /** ISO string or Date; null while the period is still unknown. */
  currentPeriodEnd: string | Date | null;
}

/**
 * Whether the reader may read members-only pages right now. Fails closed: an
 * unknown period end, a lapsed date or a non-active status all mean no access.
 */
export const isSubscriptionActive = (
  subscription: SubscriptionState | null | undefined,
  now: Date = new Date(),
): boolean => {
  if (!subscription) return false;
  if (subscription.status !== 'active') return false;
  if (subscription.currentPeriodEnd === null) return false;
  const end = new Date(subscription.currentPeriodEnd).getTime();
  return Number.isFinite(end) && end > now.getTime();
};

/** True when a page marked `members` must be withheld from this visitor. */
export const isPaywalled = (
  access: string | null | undefined,
  entitled: boolean,
): boolean => access === 'members' && !entitled;

/** ISO date one billing period from `from`, used when Stripe omits the period. */
export const periodEndFor = (
  interval: MembershipInterval,
  from: Date = new Date(),
): Date => new Date(from.getTime() + intervalDays(interval) * 24 * 60 * 60 * 1000);

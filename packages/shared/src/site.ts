import { z } from 'zod';
import { ROLES } from './rbac.js';

export const PLANS = ['free', 'starter', 'pro', 'business', 'agency'] as const;
export type Plan = (typeof PLANS)[number];

export const SSL_STATUSES = ['pending', 'active', 'error'] as const;
export type SslStatus = (typeof SSL_STATUSES)[number];

export const isSslStatus = (value: unknown): value is SslStatus =>
  typeof value === 'string' && (SSL_STATUSES as readonly string[]).includes(value);

export const subdomainSchema = z
  .string()
  .min(3)
  .max(63)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, 'subdomain ต้องเป็น a-z, 0-9 และขีดกลาง');

export const createSiteInputSchema = z.object({
  name: z.string().min(1).max(120),
  subdomain: subdomainSchema,
  localeDefault: z.string().min(2).max(10).default('th'),
  templateId: z.string().uuid().optional(),
});
export type CreateSiteInput = z.infer<typeof createSiteInputSchema>;

/** How the background build of a site's other languages is going. */
export const SITE_LOCALE_JOB_STATUSES = ['pending', 'running', 'done', 'failed'] as const;
export type SiteLocaleJobStatus = (typeof SITE_LOCALE_JOB_STATUSES)[number];

export const isSiteLocaleJobStatus = (value: unknown): value is SiteLocaleJobStatus =>
  typeof value === 'string' && (SITE_LOCALE_JOB_STATUSES as readonly string[]).includes(value);

export const siteLocaleJobSchema = z.object({
  locale: z.string(),
  status: z.enum(SITE_LOCALE_JOB_STATUSES),
  /** Pages in the default language the job copies. */
  pages: z.number().int().nonnegative(),
  /** Pages created so far. */
  done: z.number().int().nonnegative(),
  /** False when the pages were copied but the copy could not be translated. */
  translated: z.boolean(),
  /** Human wording when the job failed; null otherwise. */
  error: z.string().nullable(),
  updatedAt: z.string(),
});
export type SiteLocaleJob = z.infer<typeof siteLocaleJobSchema>;

export const siteLocaleStatusSchema = z.object({
  defaultLocale: z.string(),
  /** The default language is never listed: it already exists as the site itself. */
  locales: z.array(siteLocaleJobSchema),
});
export type SiteLocaleStatus = z.infer<typeof siteLocaleStatusSchema>;

export const inviteMemberInputSchema = z.object({
  email: z.string().email(),
  role: z.enum(ROLES),
});
export type InviteMemberInput = z.infer<typeof inviteMemberInputSchema>;

/** A public DNS name: lowercase labels, at least one dot, no scheme or path. */
export const hostnameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(253)
  .regex(
    /^(?!-)[a-z0-9-]{1,63}(?<!-)(?:\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/,
    'ที่อยู่โดเมนต้องเป็นรูปเว็บ เช่น yourbrand.com',
  );

export const addDomainInputSchema = z.object({
  hostname: hostnameSchema,
  isPrimary: z.boolean().default(false),
});
export type AddDomainInput = z.infer<typeof addDomainInputSchema>;

export const domainSummarySchema = z.object({
  id: z.string(),
  hostname: z.string(),
  isPrimary: z.boolean(),
  sslStatus: z.enum(SSL_STATUSES),
  verifiedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type DomainSummary = z.infer<typeof domainSummarySchema>;

/** `GET /sites/:id/domains` also says where to point the domain. */
export const domainListSchema = z.object({
  items: z.array(domainSummarySchema),
  /** CNAME target, e.g. `baandoi.example.com`. */
  cnameTarget: z.string(),
});
export type DomainList = z.infer<typeof domainListSchema>;

export const domainVerifyResultSchema = z.object({
  verified: z.boolean(),
  domain: domainSummarySchema,
});
export type DomainVerifyResult = z.infer<typeof domainVerifyResultSchema>;

export const updateSiteInputSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  subdomain: subdomainSchema.optional(),
  localeDefault: z.string().min(2).max(10).optional(),
  locales: z.array(z.string().min(2).max(10)).min(1).optional(),
  settings: z.record(z.unknown()).optional(),
});
export type UpdateSiteInput = z.infer<typeof updateSiteInputSchema>;

export const updateMemberInputSchema = z.object({
  role: z.enum(ROLES),
});
export type UpdateMemberInput = z.infer<typeof updateMemberInputSchema>;

/** One row of the team screen; the API answers exactly this shape. */
export const memberSummarySchema = z.object({
  userId: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: z.enum(ROLES),
  joinedAt: z.string(),
});
export type MemberSummary = z.infer<typeof memberSummarySchema>;

/** Shape the admin uses for its site switcher; the API answers exactly this. */
export const siteSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  subdomain: z.string(),
  localeDefault: z.string(),
  locales: z.array(z.string()),
  plan: z.string(),
  role: z.enum(ROLES),
  createdAt: z.string(),
});
export type SiteSummary = z.infer<typeof siteSummarySchema>;

export const paginationQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

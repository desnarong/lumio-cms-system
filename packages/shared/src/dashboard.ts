import { z } from 'zod';
import type { ApiLocale } from './api-locale.js';

/**
 * The admin dashboard (docs/design/05-admin-ia.md 5.2). Every card is derived
 * from real data so nothing on the screen is read-only: stats show a trend, the
 * health score explains what to fix, and the checklist says what to do next.
 */

/** One number plus how it moved against the previous period. */
export const dashboardMetricSchema = z.object({
  value: z.number(),
  previous: z.number(),
  /** `null` when there is no baseline yet (previous was 0), so the UI hides the %. */
  changePercent: z.number().nullable(),
});
export type DashboardMetric = z.infer<typeof dashboardMetricSchema>;

export const dashboardStatsSchema = z.object({
  visitors: dashboardMetricSchema,
  submissions: dashboardMetricSchema,
  subscribers: dashboardMetricSchema,
});
export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

export const HEALTH_IMPACTS = ['high', 'medium', 'low'] as const;
export type HealthImpact = (typeof HEALTH_IMPACTS)[number];

/** "3 สิ่งที่ควรแก้" — one actionable line, ordered by impact. */
export const siteHealthIssueSchema = z.object({
  id: z.string(),
  message: z.string(),
  impact: z.enum(HEALTH_IMPACTS),
  /** Where the admin should go to fix it. */
  href: z.string(),
});
export type SiteHealthIssue = z.infer<typeof siteHealthIssueSchema>;

export const siteHealthSchema = z.object({
  score: z.number().int().min(0).max(100),
  issues: z.array(siteHealthIssueSchema),
});
export type SiteHealth = z.infer<typeof siteHealthSchema>;

export const SITE_CHECKLIST_KEYS = [
  'site_named',
  'style_chosen',
  'home_text_edited',
  'image_uploaded',
  'domain_connected',
  'first_publish',
] as const;
export type SiteChecklistKey = (typeof SITE_CHECKLIST_KEYS)[number];

export const siteChecklistItemSchema = z.object({
  key: z.enum(SITE_CHECKLIST_KEYS),
  label: z.string(),
  done: z.boolean(),
  /** Where to go to finish this step. */
  href: z.string(),
});
export type SiteChecklistItem = z.infer<typeof siteChecklistItemSchema>;

export const siteChecklistSchema = z.object({
  items: z.array(siteChecklistItemSchema),
  doneCount: z.number().int().nonnegative(),
  total: z.number().int().positive(),
  /** True when every step is done; the card then disappears (04-ux.md 4.1). */
  complete: z.boolean(),
  /** True once the owner hid the card; it never comes back on its own. */
  dismissed: z.boolean(),
});
export type SiteChecklist = z.infer<typeof siteChecklistSchema>;

export const dashboardSiteSchema = z.object({
  id: z.string(),
  name: z.string(),
  subdomain: z.string(),
  /** Public address the "ดูเว็บ" shortcut opens. */
  url: z.string(),
  /** The site's home page, so "แก้เว็บ" opens the editor on it. */
  homeContentId: z.string().nullable(),
});
export type DashboardSite = z.infer<typeof dashboardSiteSchema>;

export const dashboardSummarySchema = z.object({
  site: dashboardSiteSchema,
  stats: dashboardStatsSchema,
  health: siteHealthSchema,
  checklist: siteChecklistSchema,
});
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

/** `PATCH /v1/dashboard/checklist`; only "hide this card" is stored. */
export const updateChecklistInputSchema = z.object({
  dismissed: z.boolean(),
});
export type UpdateChecklistInput = z.infer<typeof updateChecklistInputSchema>;

/** What the site stores under `settings.checklist`. */
export const checklistStateSchema = z.object({
  dismissed: z.boolean().default(false),
});
export type ChecklistState = z.infer<typeof checklistStateSchema>;

/** Human wording for each checklist step, shared by API and admin. */
export const SITE_CHECKLIST_LABELS: Record<SiteChecklistKey, string> = {
  site_named: 'ตั้งชื่อเว็บ',
  style_chosen: 'เลือกสไตล์',
  home_text_edited: 'เปลี่ยนข้อความหน้าแรก',
  image_uploaded: 'อัปโหลดรูป',
  domain_connected: 'เชื่อมโดเมน',
  first_publish: 'กดเผยแพร่ครั้งแรก',
};

export const SITE_CHECKLIST_LABELS_EN: Record<SiteChecklistKey, string> = {
  site_named: 'Name the site',
  style_chosen: 'Choose a style',
  home_text_edited: 'Change the home page text',
  image_uploaded: 'Upload an image',
  domain_connected: 'Connect a domain',
  first_publish: 'Publish for the first time',
};

export const siteChecklistLabel = (key: SiteChecklistKey, locale: ApiLocale = 'th'): string =>
  locale === 'en' ? SITE_CHECKLIST_LABELS_EN[key] : SITE_CHECKLIST_LABELS[key];

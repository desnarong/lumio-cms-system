import { z } from 'zod';
import type { ApiLocale } from './api-locale.js';

/**
 * Apps the owner can add to a site (docs/design/16-apps.md, 05-admin-ia.md
 * "เติบโต › Apps"). An App only ever sees the site it is installed on and only
 * through the permission scopes it declares, so the store shows them up front.
 *
 * The scope strings mirror `PERMISSION_SCOPES` in `@lumio/sdk`; a test in
 * `apps/admin` guards that the two lists never drift apart.
 */

export const APP_PERMISSIONS = [
  'contents:read',
  'contents:write:own',
  'forms:read',
  'email:send',
  'media:read',
  'media:write',
  'analytics:read',
] as const;
export type AppPermission = (typeof APP_PERMISSIONS)[number];

/** Plain-language meaning of each scope, shown before the owner installs an App. */
export const APP_PERMISSION_LABELS: Record<AppPermission, string> = {
  'contents:read': 'อ่านหน้าเว็บและบทความ',
  'contents:write:own': 'แก้ไขเนื้อหาที่ App สร้างเอง',
  'forms:read': 'อ่านข้อความจากฟอร์ม',
  'email:send': 'ส่งอีเมลผ่านระบบ',
  'media:read': 'อ่านไฟล์สื่อ',
  'media:write': 'อัปโหลดไฟล์สื่อ',
  'analytics:read': 'อ่านสถิติผู้เข้าชม',
};

export const APP_PERMISSION_LABELS_EN: Record<AppPermission, string> = {
  'contents:read': 'Read pages and posts',
  'contents:write:own': 'Edit content the App created',
  'forms:read': 'Read form messages',
  'email:send': 'Send email through the system',
  'media:read': 'Read media files',
  'media:write': 'Upload media files',
  'analytics:read': 'Read visitor analytics',
};

export const appPermissionLabel = (permission: AppPermission, locale: ApiLocale = 'th'): string =>
  locale === 'en' ? APP_PERMISSION_LABELS_EN[permission] : APP_PERMISSION_LABELS[permission];

export const APP_CATEGORIES = ['marketing', 'communication', 'analytics', 'content'] as const;
export type AppCategory = (typeof APP_CATEGORIES)[number];

export const APP_CATEGORY_LABELS: Record<AppCategory, string> = {
  marketing: 'การตลาด',
  communication: 'การติดต่อ',
  analytics: 'สถิติ',
  content: 'เนื้อหา',
};

export const APP_CATEGORY_LABELS_EN: Record<AppCategory, string> = {
  marketing: 'Marketing',
  communication: 'Communication',
  analytics: 'Analytics',
  content: 'Content',
};

export const appCategoryLabel = (category: AppCategory, locale: ApiLocale = 'th'): string =>
  locale === 'en' ? APP_CATEGORY_LABELS_EN[category] : APP_CATEGORY_LABELS[category];

export const appCatalogEntrySchema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/, 'key ต้องเป็น a-z, 0-9 และขีดกลาง'),
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(APP_CATEGORIES),
  permissions: z.array(z.enum(APP_PERMISSIONS)),
});
export type AppCatalogEntry = z.infer<typeof appCatalogEntrySchema>;

/** Built-in store. Real Apps ship their own manifest; this is the first party set. */
export const APP_CATALOG: AppCatalogEntry[] = [
  {
    key: 'seo-booster',
    name: 'ตัวช่วย SEO',
    description: 'ตรวจคำอธิบายหน้าและหัวข้อหลักให้ทุกหน้า แล้วแนะนำสิ่งที่ควรแก้',
    category: 'marketing',
    permissions: ['contents:read', 'contents:write:own', 'analytics:read'],
  },
  {
    key: 'google-analytics',
    name: 'Google Analytics',
    description: 'ส่งสถิติผู้เข้าชมไปยัง Google Analytics เพื่อดูรายงานเชิงลึก',
    category: 'analytics',
    permissions: ['analytics:read'],
  },
  {
    key: 'line-notify',
    name: 'แจ้งเตือนผ่าน LINE',
    description: 'เด้งข้อความใหม่จากฟอร์มติดต่อเข้า LINE ของทีมทันที',
    category: 'communication',
    permissions: ['forms:read'],
  },
  {
    key: 'newsletter-sender',
    name: 'ส่งข่าวสาร',
    description: 'ส่งอีเมลข่าวสารถึงผู้ติดตามที่สมัครไว้',
    category: 'marketing',
    permissions: ['email:send', 'contents:read'],
  },
  {
    key: 'booking',
    name: 'ระบบจองคิว',
    description: 'รับจองคิวออนไลน์จากลูกค้า แล้วส่งอีเมลยืนยันให้อัตโนมัติ',
    category: 'content',
    permissions: ['contents:read', 'contents:write:own', 'forms:read', 'email:send'],
  },
];

export const findCatalogApp = (key: string): AppCatalogEntry | undefined =>
  APP_CATALOG.find((app) => app.key === key);

/** Names and blurbs in English; the categories and scopes stay in the catalog. */
const APP_CATALOG_EN: Record<string, { name: string; description: string }> = {
  'seo-booster': {
    name: 'SEO helper',
    description: 'Checks every page for a description and main heading, then says what to fix',
  },
  'google-analytics': {
    name: 'Google Analytics',
    description: 'Sends visitor data to Google Analytics for in-depth reports',
  },
  'line-notify': {
    name: 'LINE notifications',
    description: 'Pushes each new contact-form message straight to the team on LINE',
  },
  'newsletter-sender': {
    name: 'Newsletter sender',
    description: 'Emails newsletters to the subscribers who signed up',
  },
  booking: {
    name: 'Booking',
    description: 'Takes online bookings and confirms them by email automatically',
  },
};

/** One catalog entry in the requested language. Unknown Apps keep their own text. */
export const localizeCatalogApp = (
  app: AppCatalogEntry,
  locale: ApiLocale = 'th',
): AppCatalogEntry => {
  if (locale !== 'en') return app;
  const translation = APP_CATALOG_EN[app.key];
  return translation ? { ...app, ...translation } : app;
};

export const APP_INSTALLED_FALLBACK: Record<ApiLocale, string> = {
  th: 'App ที่ติดตั้งไว้บนเว็บนี้',
  en: 'An App installed on this site',
};

/** An App as installed on one site, joined with its catalog or manifest details. */
export const installedAppSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(APP_CATEGORIES),
  permissions: z.array(z.enum(APP_PERMISSIONS)),
  enabled: z.boolean(),
  config: z.record(z.unknown()),
  installedAt: z.string(),
  /** Where the App came from; external Apps load their admin page from `entry`. */
  source: z.enum(['catalog', 'external']).optional(),
  entry: z.string().nullable().optional(),
  manifestUrl: z.string().nullable().optional(),
  version: z.string().nullable().optional(),
});
export type InstalledApp = z.infer<typeof installedAppSchema>;

export const installAppInputSchema = z.object({
  config: z.record(z.unknown()).default({}),
});
export type InstallAppInput = z.infer<typeof installAppInputSchema>;

export const updateInstalledAppInputSchema = z.object({
  enabled: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});
export type UpdateInstalledAppInput = z.infer<typeof updateInstalledAppInputSchema>;

/** The store: every App plus whether this site already has it. */
export const appStoreEntrySchema = appCatalogEntrySchema.extend({
  installed: z.boolean(),
  enabled: z.boolean(),
  /** External Apps show their own admin page inside the sandbox. */
  source: z.enum(['catalog', 'external']).optional(),
  entry: z.string().nullable().optional(),
  manifestUrl: z.string().nullable().optional(),
});
export type AppStoreEntry = z.infer<typeof appStoreEntrySchema>;

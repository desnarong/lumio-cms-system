import { z } from 'zod';
import { blockTreeSchema } from './blocks.js';
import { CONTENT_STATUSES, CONTENT_TYPES, seoSchema } from './content.js';
import { SUBSCRIBER_STATUSES } from './newsletter.js';
import { ORDER_STATUSES, SHOP_PAYMENT_METHODS } from './commerce.js';
import { ROLES } from './rbac.js';
import { hostnameSchema } from './site.js';

/**
 * Whole-site backup (docs/design/05-admin-ia.md "ตั้งค่า › Backup & ประวัติเวอร์ชัน",
 * 15-security.md "Backup อัตโนมัติรายวัน"). The export is one JSON file the owner
 * can download and, later, import back into the same site. Media metadata always
 * travels with it and the original bytes ride along while they fit the backup
 * budget, so a restore can rebuild the whole library.
 */

export const SITE_EXPORT_VERSION = 1;

export const siteExportSchema = z.object({
  version: z.literal(SITE_EXPORT_VERSION),
  exportedAt: z.string(),
  site: z.object({
    name: z.string(),
    subdomain: z.string(),
    localeDefault: z.string(),
    locales: z.array(z.string()),
    plan: z.string(),
    themeTokens: z.record(z.unknown()),
    settings: z.record(z.unknown()),
  }),
  contents: z.array(
    z.object({
      type: z.enum(CONTENT_TYPES),
      title: z.string(),
      slug: z.string(),
      locale: z.string(),
      status: z.enum(CONTENT_STATUSES),
      blocksDraft: blockTreeSchema,
      blocksPublished: blockTreeSchema.nullable(),
      excerpt: z.string().nullable(),
      seo: seoSchema,
      publishedAt: z.string().nullable(),
    }),
  ),
  menus: z.array(
    z.object({
      location: z.string(),
      items: z.array(z.unknown()),
      /** Language of the menu; null means it serves every language. */
      locale: z.string().nullable().optional(),
    }),
  ),
  globalBlocks: z.array(
    z.object({
      name: z.string().nullable(),
      kind: z.string().nullable(),
      blocks: blockTreeSchema,
    }),
  ),
  sectionTemplates: z.array(
    z.object({
      name: z.string(),
      blocks: blockTreeSchema,
    }),
  ),
  forms: z.array(
    z.object({
      name: z.string().nullable(),
      fields: z.array(z.unknown()),
      notify: z.record(z.unknown()),
      successMessage: z.string().nullable(),
    }),
  ),
  subscribers: z.array(
    z.object({
      email: z.string(),
      status: z.enum(SUBSCRIBER_STATUSES),
    }),
  ),
  /** Custom domains reconnect without retyping; DNS still has to be verified. */
  domains: z
    .array(
      z.object({
        hostname: hostnameSchema,
        isPrimary: z.boolean().default(false),
      }),
    )
    .optional()
    .default([]),
  /** Memberships return only for people who already have an account. */
  members: z
    .array(
      z.object({
        email: z.string().email(),
        role: z.enum(ROLES),
      }),
    )
    .optional()
    .default([]),
  /**
   * Media metadata plus the original bytes, so a restore can put images back and
   * let the media worker rebuild the WebP/AVIF ladder. `files` is empty when a
   * file was too large for the backup budget; the metadata still restores.
   */
  /**
   * Shop data. Product images travel as media filenames, because a restore
   * creates new media rows and the ids therefore change.
   */
  products: z
    .array(
      z.object({
        title: z.string(),
        slug: z.string(),
        description: z.string().default(''),
        price: z.number().int().nonnegative(),
        compareAtPrice: z.number().int().nullable().default(null),
        stock: z.number().int().nonnegative().nullable().default(null),
        category: z.string().nullable().default(null),
        status: z.enum(['draft', 'active', 'archived']),
        images: z.array(z.string()).optional().default([]),
      }),
    )
    .optional()
    .default([]),
  /** Orders keep their snapshot, so a receipt survives even without the product. */
  orders: z
    .array(
      z.object({
        number: z.string(),
        status: z.enum(ORDER_STATUSES),
        paymentMethod: z.enum(SHOP_PAYMENT_METHODS),
        customer: z.record(z.unknown()),
        note: z.string().default(''),
        subtotal: z.number().int().nonnegative(),
        shippingFee: z.number().int().nonnegative(),
        total: z.number().int().nonnegative(),
        trackingNumber: z.string().nullable().default(null),
        paidAt: z.string().nullable().default(null),
        createdAt: z.string(),
        items: z.array(
          z.object({
            title: z.string(),
            price: z.number().int().nonnegative(),
            quantity: z.number().int().positive(),
          }),
        ),
      }),
    )
    .optional()
    .default([]),
  media: z
    .array(
      z.object({
        filename: z.string(),
        mime: z.string(),
        sizeBytes: z.number().int().nonnegative(),
        width: z.number().int().nullable(),
        height: z.number().int().nullable(),
        alt: z.string().nullable(),
        folder: z.string().nullable(),
        focalPoint: z.object({ x: z.number(), y: z.number() }).nullable().optional(),
        files: z
          .array(
            z.object({
              name: z.string(),
              mime: z.string(),
              base64: z.string(),
            }),
          )
          .optional()
          .default([]),
      }),
    )
    .optional(),
});
export type SiteExport = z.infer<typeof siteExportSchema>;

export const siteImportInputSchema = siteExportSchema;
export type SiteImportInput = z.infer<typeof siteImportInputSchema>;

/** How many rows an import added or skipped, so the toast can be honest. */
export const siteImportResultSchema = z.object({
  contents: z.object({ added: z.number().int().nonnegative(), skipped: z.number().int().nonnegative() }),
  menus: z.number().int().nonnegative(),
  globalBlocks: z.number().int().nonnegative(),
  sectionTemplates: z.number().int().nonnegative(),
  forms: z.number().int().nonnegative(),
  subscribers: z.object({ added: z.number().int().nonnegative(), skipped: z.number().int().nonnegative() }),
  domains: z.object({ added: z.number().int().nonnegative(), skipped: z.number().int().nonnegative() }),
  members: z.object({ added: z.number().int().nonnegative(), skipped: z.number().int().nonnegative() }),
  products: z.object({ added: z.number().int().nonnegative(), skipped: z.number().int().nonnegative() }),
  orders: z.object({ added: z.number().int().nonnegative(), skipped: z.number().int().nonnegative() }),
  media: z
    .object({ added: z.number().int().nonnegative(), skipped: z.number().int().nonnegative() })
    .optional()
    .default({ added: 0, skipped: 0 }),
});
export type SiteImportResult = z.infer<typeof siteImportResultSchema>;

/** The download payload; the JSON travels in the envelope as a string. */
export const siteExportFileSchema = z.object({
  filename: z.string(),
  content: z.string(),
});
export type SiteExportFile = z.infer<typeof siteExportFileSchema>;

/** `baandoi-backup-2026-10-21.json` — stable and easy to sort. */
export const backupFilename = (subdomain: string, now: Date = new Date()): string =>
  `${subdomain || 'site'}-backup-${now.toISOString().slice(0, 10)}.json`;

/**
 * Automatic backups (docs/design/03-scope.md "Auto Backup + Version History",
 * 15-security.md). The worker takes one snapshot a day at the chosen hour and
 * keeps the newest N, so an owner who never opens the dashboard still has a
 * recent copy.
 */
export const BACKUP_SCHEDULE_DEFAULTS = {
  enabled: false,
  hour: 3,
  retentionDays: 14,
} as const;

export const backupScheduleInputSchema = z.object({
  enabled: z.boolean(),
  /** 0–23, the site's local hour (the worker checks every 30 minutes). */
  hour: z.coerce.number().int().min(0).max(23),
  retentionDays: z.coerce.number().int().min(3).max(90),
});
export type BackupScheduleInput = z.infer<typeof backupScheduleInputSchema>;

export const backupScheduleViewSchema = backupScheduleInputSchema.extend({
  /** ISO timestamp of the newest snapshot, or null before the first run. */
  lastRunAt: z.string().nullable(),
});
export type BackupScheduleView = z.infer<typeof backupScheduleViewSchema>;

export const backupSnapshotSchema = z.object({
  id: z.string(),
  filename: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  kind: z.enum(['auto', 'manual']),
  createdAt: z.string(),
});
export type BackupSnapshot = z.infer<typeof backupSnapshotSchema>;

export const backupOverviewSchema = z.object({
  schedule: backupScheduleViewSchema,
  items: z.array(backupSnapshotSchema),
});
export type BackupOverview = z.infer<typeof backupOverviewSchema>;

/** Reads `sites.settings.backup`; anything unreadable falls back to the defaults. */
export const readBackupSchedule = (settings: unknown): BackupScheduleInput => {
  const value =
    settings !== null && typeof settings === 'object' && !Array.isArray(settings)
      ? (settings as Record<string, unknown>).backup
      : undefined;
  const parsed = backupScheduleInputSchema.safeParse(value);
  return parsed.success ? parsed.data : { ...BACKUP_SCHEDULE_DEFAULTS };
};

/** True when the daily snapshot for `now` is due and has not run yet. */
export const backupDue = (
  schedule: BackupScheduleInput,
  lastRunAt: Date | null,
  now: Date,
): boolean => {
  if (!schedule.enabled) return false;
  if (now.getHours() < schedule.hour) return false;
  if (!lastRunAt) return true;
  return (
    lastRunAt.getFullYear() !== now.getFullYear() ||
    lastRunAt.getMonth() !== now.getMonth() ||
    lastRunAt.getDate() !== now.getDate()
  );
};

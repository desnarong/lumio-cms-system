import { z } from 'zod';
import { blockTreeSchema, type BlockTree } from './blocks.js';
import { paginationQuerySchema } from './site.js';

export const CONTENT_TYPES = ['page', 'post'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_STATUSES = ['draft', 'scheduled', 'published', 'archived'] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

/** Who may read a published page or post (docs/PROGRESS.md batch A). */
export const CONTENT_ACCESS = ['public', 'members'] as const;
export type ContentAccess = (typeof CONTENT_ACCESS)[number];

/** How long a page or post stays in the trash before the purge job removes it. */
export const CONTENT_TRASH_RETENTION_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const isContentType = (value: unknown): value is ContentType =>
  typeof value === 'string' && (CONTENT_TYPES as readonly string[]).includes(value);

export const isContentStatus = (value: unknown): value is ContentStatus =>
  typeof value === 'string' && (CONTENT_STATUSES as readonly string[]).includes(value);

/**
 * When the purge job may delete a trashed page. `null` when the page is not in
 * the trash, so callers can show "ลบถาวรได้หลังวันที่…" only where it applies.
 */
export const trashPurgeAt = (archivedAt: string | null): string | null => {
  if (!archivedAt) return null;
  const at = new Date(archivedAt).getTime();
  if (Number.isNaN(at)) return null;
  return new Date(at + CONTENT_TRASH_RETENTION_DAYS * MS_PER_DAY).toISOString();
};

/** Whole days left before a trashed page is purged; 0 once it is due. */
export const trashDaysLeft = (archivedAt: string | null, now: Date = new Date()): number => {
  const purgeAt = trashPurgeAt(archivedAt);
  if (!purgeAt) return 0;
  const remaining = new Date(purgeAt).getTime() - now.getTime();
  return remaining <= 0 ? 0 : Math.ceil(remaining / MS_PER_DAY);
};

/** True once a trashed page has aged past the retention window. */
export const isTrashExpired = (archivedAt: string | null, now: Date = new Date()): boolean =>
  archivedAt !== null && trashDaysLeft(archivedAt, now) === 0;

export const slugSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'ชื่อลิงก์ต้องเป็นตัวพิมพ์เล็กและคั่นด้วยขีดกลาง');

/**
 * Turns a title into a URL slug. Thai characters carry no ASCII equivalent, so
 * anything that survives the filter is used and the caller's fallback is kept
 * when nothing does (the editor still lets the user type their own).
 */
export const slugify = (input: string, fallback = 'page'): string => {
  const normalized = input
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
  return normalized.length > 0 ? normalized : fallback;
};

export const seoSchema = z.object({
  title: z.string().max(70).optional(),
  description: z.string().max(160).optional(),
  ogImage: z.string().url().optional(),
  noindex: z.boolean().default(false),
});
export type Seo = z.infer<typeof seoSchema>;

/**
 * A partial SEO update. Every field is optional and `noindex` carries no default,
 * so a screen that only fixes the title keeps the saved description and the
 * search-visibility flag untouched.
 */
export const seoPatchSchema = z.object({
  title: z.string().max(70).optional(),
  description: z.string().max(160).optional(),
  ogImage: z.string().url().optional(),
  noindex: z.boolean().optional(),
});
export type SeoPatch = z.infer<typeof seoPatchSchema>;

export const createContentInputSchema = z.object({
  type: z.enum(CONTENT_TYPES),
  title: z.string().min(1).max(200),
  slug: slugSchema,
  locale: z.string().min(2).max(10).default('th'),
  excerpt: z.string().max(300).optional(),
  /** Cover image from the media library; shown on post cards and the post page. */
  coverMediaId: z.string().uuid().nullable().optional(),
  blocks: blockTreeSchema.default([]),
  seo: seoSchema.default({}),
  /** Members-only pages are withheld from visitors who have not joined. */
  access: z.enum(CONTENT_ACCESS).optional(),
});
export type CreateContentInput = z.infer<typeof createContentInputSchema>;

export const updateContentInputSchema = createContentInputSchema.partial().extend({
  status: z.enum(CONTENT_STATUSES).optional(),
});
export type UpdateContentInput = z.infer<typeof updateContentInputSchema>;

/** Filters for the content list screen (docs/design/05-admin-ia.md 5.4). */
export const contentListQuerySchema = paginationQuerySchema.extend({
  type: z.enum(CONTENT_TYPES).optional(),
  status: z.enum(CONTENT_STATUSES).optional(),
  q: z.string().trim().max(120).optional(),
  /** Language filter; omit to list every language (docs/design/17-i18n.md 17.3). */
  locale: z.string().trim().min(2).max(10).optional(),
});
export type ContentListQuery = z.infer<typeof contentListQuerySchema>;

/**
 * Autosave payload. `baseRevision` is the revision the editor last saw; the API
 * answers 409 when the stored revision moved on (docs/design/12-api.md 12.3).
 */
export const saveContentBlocksInputSchema = z.object({
  blocks: blockTreeSchema,
  baseRevision: z.number().int().positive(),
});
export type SaveContentBlocksInput = z.infer<typeof saveContentBlocksInputSchema>;

export interface ContentSummary {
  id: string;
  type: ContentType;
  title: string;
  slug: string;
  status: ContentStatus;
  locale: string;
  /**
   * Every language of this page shares one group id; a page that has no
   * translations yet is its own group (docs/design/17-i18n.md 17.2).
   */
  translationGroupId: string;
  excerpt: string | null;
  revision: number;
  updatedAt: string;
  publishedAt: string | null;
  /** Set when the page is in the trash; drives the restore/purge actions. */
  archivedAt: string | null;
  /** Public URL of the chosen cover image, when the list loaded it. */
  coverImageUrl?: string | null;
  /** `members` pages only open for readers with a live membership. */
  access: ContentAccess;
}

export interface ContentDetail extends ContentSummary {
  /** Unsaved-to-the-public draft blocks the editor works on. */
  blocks: BlockTree;
  publishedBlocks: BlockTree | null;
  seo: Seo;
  createdAt: string;
  /** Cover image picked in the media library; posts show it in the blog list. */
  coverMediaId?: string | null;
  /** Public URL of the cover, so the editor can show the current picture. */
  coverImageUrl?: string | null;
}

export interface ContentVersionSummary {
  id: string;
  note: string | null;
  createdAt: string;
  authorId: string | null;
  /** Display name of whoever saved the version, so the history reads like a story. */
  authorName: string | null;
  /** How many sections the snapshot holds; the list shows it without loading blocks. */
  blockCount: number;
}

/** One saved version with its blocks, for the preview in the history panel. */
export interface ContentVersionDetail extends ContentVersionSummary {
  blocks: BlockTree;
}

/** Manual "save a version" from the editor; the note shows in the history list. */
export const createContentVersionInputSchema = z.object({
  note: z.string().trim().max(120).optional(),
});
export type CreateContentVersionInput = z.infer<typeof createContentVersionInputSchema>;

export interface SaveContentBlocksResult {
  revision: number;
  savedAt: string;
}

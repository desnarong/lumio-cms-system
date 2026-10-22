import { z } from 'zod';
import { paginationQuerySchema } from './site.js';

/**
 * Media library contract (docs/design/12-api.md 12.6). The upload is presigned:
 * the browser PUTs the file straight to storage, the API only keeps metadata and
 * a worker turns the original into the WebP/AVIF ladder the public site links.
 */

/** Formats we accept on upload. SVG is deliberately absent: it can carry scripts. */
export const UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
] as const;
export type UploadMimeType = (typeof UPLOAD_MIME_TYPES)[number];

export const isUploadMimeType = (value: unknown): value is UploadMimeType =>
  typeof value === 'string' && (UPLOAD_MIME_TYPES as readonly string[]).includes(value);

export const MEDIA_MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

/** `pending` = URL handed out, `trashed` = deleted but still restorable (undo). */
export const MEDIA_STATUSES = ['pending', 'processing', 'ready', 'failed', 'trashed'] as const;
export type MediaStatus = (typeof MEDIA_STATUSES)[number];

/** How long a deleted image stays restorable before the sweep removes the files. */
export const MEDIA_TRASH_RETENTION_DAYS = 30;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * When the sweep may delete a trashed image. `null` when the image is not in the
 * trash, so the screen can show "ลบถาวรได้หลังวันที่…" only where it applies.
 */
export const mediaTrashPurgeAt = (archivedAt: string | null): string | null => {
  if (!archivedAt) return null;
  const at = new Date(archivedAt).getTime();
  if (Number.isNaN(at)) return null;
  return new Date(at + MEDIA_TRASH_RETENTION_DAYS * MS_PER_DAY).toISOString();
};

/** Whole days left before a trashed image is purged; 0 once it is due. */
export const mediaTrashDaysLeft = (
  archivedAt: string | null,
  now: Date = new Date(),
): number => {
  const purgeAt = mediaTrashPurgeAt(archivedAt);
  if (!purgeAt) return 0;
  const remaining = new Date(purgeAt).getTime() - now.getTime();
  return remaining <= 0 ? 0 : Math.ceil(remaining / MS_PER_DAY);
};

/** True once a trashed image has aged past the retention window. */
export const isMediaTrashExpired = (
  archivedAt: string | null,
  now: Date = new Date(),
): boolean => archivedAt !== null && mediaTrashDaysLeft(archivedAt, now) === 0;

export const isMediaStatus = (value: unknown): value is MediaStatus =>
  typeof value === 'string' && (MEDIA_STATUSES as readonly string[]).includes(value);

/** Widths the pipeline renders. `Img` builds its `srcset` from whatever exists. */
export const MEDIA_VARIANT_WIDTHS = [480, 768, 1024, 1600, 2048] as const;

/** Formats the pipeline writes; the `srcset` links the first one (webp). */
export const MEDIA_VARIANT_FORMATS = ['webp', 'avif'] as const;
export type MediaVariantFormat = (typeof MEDIA_VARIANT_FORMATS)[number];

/** One entry of the responsive ladder stored on `media.variants`. */
export const mediaVariantSchema = z.object({
  w: z.number().int().positive(),
  h: z.number().int().positive().optional(),
  /** Storage key (or absolute URL) of the rendered file. */
  url: z.string().min(1),
  format: z.string().min(1),
  sizeBytes: z.number().int().nonnegative().optional(),
});
export type MediaVariant = z.infer<typeof mediaVariantSchema>;
export const mediaVariantsSchema = z.array(mediaVariantSchema);

export const focalPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});
export type FocalPoint = z.infer<typeof focalPointSchema>;

/**
 * A crop window in fractions of the original image (docs/design/12-api.md 12.6).
 * The pipeline re-renders the ladder from this window, so the editor and the
 * public site never need to know about it again.
 */
export const mediaCropSchema = z
  .object({
    x: z.number().min(0).max(0.95),
    y: z.number().min(0).max(0.95),
    width: z.number().min(0.05).max(1),
    height: z.number().min(0.05).max(1),
  })
  .superRefine((crop, ctx) => {
    if (crop.x + crop.width > 1.0001) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'กรอบครอปเกินขอบขวาของรูป' });
    }
    if (crop.y + crop.height > 1.0001) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'กรอบครอปเกินขอบล่างของรูป' });
    }
  });
export type MediaCrop = z.infer<typeof mediaCropSchema>;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** Keeps a slider inside the image so the UI can never send an invalid window. */
export const clampMediaCrop = (crop: MediaCrop, minSize = 0.05): MediaCrop => {
  const width = Math.min(1, Math.max(minSize, crop.width));
  const height = Math.min(1, Math.max(minSize, crop.height));
  return {
    x: Math.min(clamp01(crop.x), 1 - width),
    y: Math.min(clamp01(crop.y), 1 - height),
    width,
    height,
  };
};

/** The crop window in pixels for a given oriented image size (sharp `extract`). */
export const mediaCropBox = (
  crop: MediaCrop,
  width: number,
  height: number,
): { left: number; top: number; width: number; height: number } => {
  const safe = clampMediaCrop(crop);
  const left = Math.min(Math.round(safe.x * width), Math.max(0, width - 1));
  const top = Math.min(Math.round(safe.y * height), Math.max(0, height - 1));
  return {
    left,
    top,
    width: Math.max(1, Math.min(Math.round(safe.width * width), width - left)),
    height: Math.max(1, Math.min(Math.round(safe.height * height), height - top)),
  };
};

const folderSchema = z.string().trim().min(1).max(60);
const altSchema = z.string().trim().max(300);

/** Step 1: the client announces the file before uploading it. */
export const presignUploadInputSchema = z.object({
  filename: z.string().trim().min(1).max(200),
  mime: z.enum(UPLOAD_MIME_TYPES),
  size: z
    .number()
    .int()
    .positive()
    .max(MEDIA_MAX_UPLOAD_BYTES, 'ไฟล์ใหญ่เกินกำหนด'),
  folder: folderSchema.optional(),
});
export type PresignUploadInput = z.infer<typeof presignUploadInputSchema>;

export const presignUploadResultSchema = z.object({
  mediaId: z.string().min(1),
  uploadUrl: z.string().min(1),
  method: z.literal('PUT'),
  headers: z.record(z.string()),
  expiresAt: z.string(),
  maxBytes: z.number().int().positive(),
});
export type PresignUploadResult = z.infer<typeof presignUploadResultSchema>;

/** Step 4: the client reports what it uploaded (dimensions are a hint; sharp wins). */
export const confirmUploadInputSchema = z.object({
  width: z.number().int().positive().max(20_000).optional(),
  height: z.number().int().positive().max(20_000).optional(),
  alt: altSchema.optional(),
  folder: folderSchema.optional(),
});
export type ConfirmUploadInput = z.infer<typeof confirmUploadInputSchema>;

export const updateMediaInputSchema = z.object({
  alt: altSchema.nullable().optional(),
  folder: folderSchema.nullable().optional(),
  focalPoint: focalPointSchema.nullable().optional(),
  /** `null` removes the crop and restores the full picture. */
  crop: mediaCropSchema.nullable().optional(),
});
export type UpdateMediaInput = z.infer<typeof updateMediaInputSchema>;

/** One request may touch at most this many images (docs/design/12-api.md 12.8). */
export const MAX_BULK_MEDIA = 100;

const bulkAltSchema = z.object({
  id: z.string().uuid(),
  alt: altSchema.nullable(),
});

/**
 * Bulk actions in the library: describe several images at once (each with its
 * own text) and/or move them into one folder. Rejects entries that are not in
 * `ids`, so a client cannot use the endpoint to edit an unselected image.
 */
export const bulkUpdateMediaInputSchema = z
  .object({
    ids: z.array(z.string().uuid()).min(1).max(MAX_BULK_MEDIA),
    alt: z.array(bulkAltSchema).max(MAX_BULK_MEDIA).optional(),
    folder: folderSchema.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.alt === undefined && value.folder === undefined) {
      ctx.addIssue({ code: 'custom', message: 'เลือกอย่างน้อยหนึ่งอย่างที่ต้องแก้' });
      return;
    }
    const selected = new Set(value.ids);
    for (const entry of value.alt ?? []) {
      if (!selected.has(entry.id)) {
        ctx.addIssue({ code: 'custom', message: 'มีรูปที่ไม่ได้เลือกอยู่ในรายการแก้ไข' });
        break;
      }
    }
  });
export type BulkUpdateMediaInput = z.infer<typeof bulkUpdateMediaInputSchema>;

export interface BulkMediaUpdateResult {
  count: number;
  items: MediaItem[];
}

export const mediaListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(120).optional(),
  folder: folderSchema.optional(),
});
export type MediaListQuery = z.infer<typeof mediaListQuerySchema>;

export interface MediaItem {
  id: string;
  /** Resolved URL of the best variant (or the original) for previews. */
  url: string;
  /** Ready-to-use `srcset`; null while the pipeline has not run yet. */
  srcSet: string | null;
  /** AVIF ladder for `<picture>`, so newer browsers download the smaller file. */
  avifSrcSet?: string | null;
  filename: string | null;
  mime: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  alt: string | null;
  folder: string | null;
  focalPoint: FocalPoint | null;
  /** Window the ladder was rendered from; absent for uncropped or old images. */
  crop?: MediaCrop | null;
  variants: MediaVariant[];
  status: MediaStatus;
  createdAt: string;
  updatedAt: string;
}

/** Joins a storage key onto a media base URL, tolerating slashes on either side. */
export const mediaUrlFor = (base: string, key: string): string =>
  `${base.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`;

export const isAbsoluteUrl = (value: string): boolean => /^https?:\/\//i.test(value);

/** Picks the smallest variant that still covers `width`, else the largest one. */
export const pickVariant = (variants: readonly MediaVariant[], width: number): MediaVariant | null => {
  const usable = [...variants]
    .filter((variant) => variant.url.length > 0)
    .sort((a, b) => a.w - b.w);
  if (usable.length === 0) return null;

  const bigger = usable.find((variant) => variant.w >= width);
  return bigger ?? usable[usable.length - 1] ?? null;
};

export interface SrcSetOptions {
  /** Format used for the ladder. WebP is universally supported; AVIF needs `<picture>`. */
  format?: MediaVariantFormat;
  /** Width of the element, used for the `sizes` attribute hint. */
  maxWidth?: number;
}

/**
 * Builds a `srcset` from a variant ladder. Only one format is used so every
 * candidate decodes in every supporting browser; widths are de-duplicated and
 * sorted so the browser can pick the cheapest file that fits.
 */
export const buildSrcSet = (
  variants: readonly MediaVariant[],
  base: string,
  options: SrcSetOptions = {},
): string | null => {
  const format = options.format ?? 'webp';
  const byWidth = new Map<number, MediaVariant>();

  for (const variant of variants) {
    if (variant.url.length === 0 || variant.format !== format) continue;
    if (!byWidth.has(variant.w)) byWidth.set(variant.w, variant);
  }

  if (byWidth.size === 0) return null;

  return [...byWidth.entries()]
    .sort(([a], [b]) => a - b)
    .map(([width, variant]) => `${mediaUrlFor(base, variant.url)} ${width}w`)
    .join(', ');
};

/** Resolves a stored variant key into a URL once the media base is known. */
export const resolveVariantUrl = (variant: MediaVariant, base: string): string =>
  isAbsoluteUrl(variant.url) ? variant.url : mediaUrlFor(base, variant.url);
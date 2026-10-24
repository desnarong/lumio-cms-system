import { z } from 'zod';
import { focalPointSchema, safeLinkSchema } from '@lumio/shared';

export const TEXT_ALIGNMENTS = ['left', 'center', 'right'] as const;
export type TextAlignment = (typeof TEXT_ALIGNMENTS)[number];

export const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost'] as const;
export type BlockButtonVariant = (typeof BUTTON_VARIANTS)[number];

export const BUTTON_SIZES = ['sm', 'md', 'lg'] as const;
export type BlockButtonSize = (typeof BUTTON_SIZES)[number];

export const IMAGE_ASPECTS = ['auto', 'square', 'wide', 'photo', 'video'] as const;
export type BlockImageAspect = (typeof IMAGE_ASPECTS)[number];

/** Image reference shared by every block that shows a picture. */
export const imageValueSchema = z.object({
  mediaId: z.string().default(''),
  alt: z.string().default(''),
  /** Preview URL resolved from the media library; absent until a file is chosen. */
  src: z.string().optional(),
  /** Responsive ladder from the media pipeline; absent for hand-typed URLs. */
  srcSet: z.string().optional(),
  /** AVIF ladder for `<picture>`; absent for URLs and old content. */
  avifSrcSet: z.string().optional(),
  /** Where the image should stay in frame when the block crops it. */
  focalPoint: focalPointSchema.optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});
export type ImageValue = z.infer<typeof imageValueSchema>;

/** Link + label pair used by buttons and calls to action. */
export const buttonValueSchema = z.object({
  label: z.string().default('ดูเพิ่มเติม'),
  href: safeLinkSchema.default('/'),
  variant: z.enum(BUTTON_VARIANTS).default('primary'),
  external: z.boolean().default(false),
});
export type BlockButtonValue = z.infer<typeof buttonValueSchema>;

export const alignmentOptions = [
  { value: 'left', label: 'ชิดซ้าย' },
  { value: 'center', label: 'กึ่งกลาง' },
  { value: 'right', label: 'ชิดขวา' },
];

export const buttonVariantOptions = [
  { value: 'primary', label: 'ปุ่มหลัก' },
  { value: 'secondary', label: 'ปุ่มรอง' },
  { value: 'ghost', label: 'ปุ่มโปร่ง' },
];

export const buttonSizeOptions = [
  { value: 'sm', label: 'เล็ก' },
  { value: 'md', label: 'กลาง' },
  { value: 'lg', label: 'ใหญ่' },
];

export const imageAspectOptions = [
  { value: 'auto', label: 'ตามภาพต้นฉบับ' },
  { value: 'square', label: 'จัตุรัส' },
  { value: 'wide', label: 'แนวนอน' },
  { value: 'photo', label: 'ภาพถ่าย (4:3)' },
  { value: 'video', label: 'อัตราส่วนวิดีโอ' },
];

/** Turns an `ImagePicker` result (a URL) into a stored image value. */
export const imageFromUrl = (url: string | null, alt: string): ImageValue | null =>
  url ? { mediaId: '', alt, src: url } : null;

/** Turns a media-library pick into a stored image value, keeping the ladder. */
export const imageFromPick = (
  picked: {
    url: string;
    alt?: string;
    mediaId?: string;
    srcSet?: string;
    avifSrcSet?: string;
    focalPoint?: { x: number; y: number };
    width?: number;
    height?: number;
  },
  fallbackAlt: string,
): ImageValue => ({
  mediaId: picked.mediaId ?? '',
  alt: picked.alt || fallbackAlt,
  src: picked.url,
  ...(picked.srcSet ? { srcSet: picked.srcSet } : {}),
  ...(picked.avifSrcSet ? { avifSrcSet: picked.avifSrcSet } : {}),
  ...(picked.focalPoint ? { focalPoint: picked.focalPoint } : {}),
  ...(picked.width ? { width: picked.width } : {}),
  ...(picked.height ? { height: picked.height } : {}),
});

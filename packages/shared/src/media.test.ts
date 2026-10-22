import { describe, expect, it } from 'vitest';
import {
  MEDIA_MAX_UPLOAD_BYTES,
  MEDIA_TRASH_RETENTION_DAYS,
  buildSrcSet,
  isMediaTrashExpired,
  mediaTrashDaysLeft,
  mediaTrashPurgeAt,
  clampMediaCrop,
  mediaCropBox,
  mediaCropSchema,
  confirmUploadInputSchema,
  isUploadMimeType,
  mediaUrlFor,
  pickVariant,
  presignUploadInputSchema,
  resolveVariantUrl,
  updateMediaInputSchema,
  type MediaVariant,
} from './media.js';

const variants: MediaVariant[] = [
  { w: 1280, h: 720, url: 'site/hero-1280.webp', format: 'webp' },
  { w: 480, h: 270, url: 'site/hero-480.webp', format: 'webp' },
  { w: 480, h: 270, url: 'site/hero-480.avif', format: 'avif' },
];

describe('presignUploadInputSchema', () => {
  it('accepts the image formats the library supports', () => {
    const parsed = presignUploadInputSchema.parse({
      filename: 'หน้าร้าน.jpg',
      mime: 'image/jpeg',
      size: 1024,
      folder: 'hero',
    });
    expect(parsed.folder).toBe('hero');
  });

  it('refuses SVG uploads, which can carry scripts', () => {
    const result = presignUploadInputSchema.safeParse({
      filename: 'logo.svg',
      mime: 'image/svg+xml',
      size: 512,
    });
    expect(result.success).toBe(false);
    expect(isUploadMimeType('image/svg+xml')).toBe(false);
  });

  it('caps the upload size', () => {
    const result = presignUploadInputSchema.safeParse({
      filename: 'raw.jpg',
      mime: 'image/jpeg',
      size: MEDIA_MAX_UPLOAD_BYTES + 1,
    });
    expect(result.success).toBe(false);
  });

  it('requires a filename and a known mime type', () => {
    expect(
      presignUploadInputSchema.safeParse({ filename: '  ', mime: 'image/png', size: 10 }).success,
    ).toBe(false);
  });
});

describe('confirmUploadInputSchema', () => {
  it('keeps the reported dimensions optional', () => {
    expect(confirmUploadInputSchema.parse({})).toEqual({});
  });

  it('rejects impossible dimensions', () => {
    expect(confirmUploadInputSchema.safeParse({ width: 0 }).success).toBe(false);
    expect(confirmUploadInputSchema.safeParse({ width: 99_999 }).success).toBe(false);
  });
});

describe('updateMediaInputSchema', () => {
  it('allows clearing alt, folder and the focal point', () => {
    expect(updateMediaInputSchema.parse({ alt: null, focalPoint: null })).toEqual({
      alt: null,
      focalPoint: null,
    });
  });

  it('keeps the focal point inside the image', () => {
    expect(updateMediaInputSchema.safeParse({ focalPoint: { x: 1.2, y: 0.5 } }).success).toBe(
      false,
    );
  });
});

describe('pickVariant', () => {
  it('returns the cheapest variant that covers the requested width', () => {
    expect(pickVariant(variants, 700)?.w).toBe(1280);
  });

  it('falls back to the smallest variant when everything is smaller', () => {
    expect(pickVariant(variants, 400)?.w).toBe(480);
  });

  it('returns null when nothing has been rendered yet', () => {
    expect(pickVariant([], 480)).toBeNull();
    expect(pickVariant([{ w: 10, url: '', format: 'webp' }], 480)).toBeNull();
  });
});

describe('buildSrcSet', () => {
  it('links one format, de-duplicated and sorted by width', () => {
    expect(buildSrcSet(variants, 'https://cdn.example.com/media')).toBe(
      'https://cdn.example.com/media/site/hero-480.webp 480w, https://cdn.example.com/media/site/hero-1280.webp 1280w',
    );
  });

  it('returns null when the requested format has not been rendered', () => {
    expect(buildSrcSet(variants, '/media', { format: 'avif' })).toContain('hero-480.avif 480w');
    expect(buildSrcSet([], '/media')).toBeNull();
  });
});

describe('mediaUrlFor / resolveVariantUrl', () => {
  it('normalises slashes on both sides', () => {
    expect(mediaUrlFor('/media/', '/site/a.png')).toBe('/media/site/a.png');
  });

  it('leaves absolute variant URLs untouched', () => {
    expect(resolveVariantUrl({ w: 1, url: 'https://x.dev/a.webp', format: 'webp' }, '/media')).toBe(
      'https://x.dev/a.webp',
    );
  });
});

describe('media trash retention', () => {
  const archivedAt = '2026-10-01T00:00:00.000Z';

  it('purges an image 30 days after it was deleted', () => {
    const purgeAt = mediaTrashPurgeAt(archivedAt);
    expect(purgeAt).not.toBeNull();
    const days =
      (new Date(purgeAt as string).getTime() - new Date(archivedAt).getTime()) / 86_400_000;
    expect(days).toBe(MEDIA_TRASH_RETENTION_DAYS);
  });

  it('has nothing to purge when the image is not in the trash', () => {
    expect(mediaTrashPurgeAt(null)).toBeNull();
    expect(mediaTrashDaysLeft(null)).toBe(0);
    expect(isMediaTrashExpired(null)).toBe(false);
  });

  it('counts the days left and clamps at zero once due', () => {
    const day5 = new Date('2026-10-06T00:00:00.000Z');
    expect(mediaTrashDaysLeft(archivedAt, day5)).toBe(MEDIA_TRASH_RETENTION_DAYS - 5);

    const overdue = new Date('2026-12-01T00:00:00.000Z');
    expect(mediaTrashDaysLeft(archivedAt, overdue)).toBe(0);
    expect(isMediaTrashExpired(archivedAt, overdue)).toBe(true);
    expect(isMediaTrashExpired(archivedAt, day5)).toBe(false);
  });
});

describe('media crop', () => {
  it('accepts a window inside the picture', () => {
    expect(
      mediaCropSchema.parse({ x: 0.1, y: 0.2, width: 0.5, height: 0.4 }),
    ).toEqual({ x: 0.1, y: 0.2, width: 0.5, height: 0.4 });
  });

  it('refuses a window that runs past the right or bottom edge', () => {
    expect(() => mediaCropSchema.parse({ x: 0.6, y: 0, width: 0.5, height: 0.5 })).toThrow();
    expect(() => mediaCropSchema.parse({ x: 0, y: 0.8, width: 0.4, height: 0.5 })).toThrow();
  });

  it('pulls a slider back inside the picture', () => {
    expect(clampMediaCrop({ x: 0.9, y: 0.95, width: 0.4, height: 0.3 })).toEqual({
      x: 0.6,
      y: 0.7,
      width: 0.4,
      height: 0.3,
    });
    expect(clampMediaCrop({ x: -1, y: -1, width: 0.01, height: 0.01 })).toEqual({
      x: 0,
      y: 0,
      width: 0.05,
      height: 0.05,
    });
  });

  it('turns the window into sharp extract pixels', () => {
    expect(mediaCropBox({ x: 0.25, y: 0.5, width: 0.5, height: 0.25 }, 1200, 800)).toEqual({
      left: 300,
      top: 400,
      width: 600,
      height: 200,
    });
  });

  it('never extracts outside the original', () => {
    expect(mediaCropBox({ x: 0.9, y: 0.9, width: 0.5, height: 0.5 }, 100, 100)).toEqual({
      left: 50,
      top: 50,
      width: 50,
      height: 50,
    });
  });

  it('lets the editor set and clear a crop through the update contract', () => {
    const crop = { x: 0, y: 0, width: 0.8, height: 0.6 };
    expect(updateMediaInputSchema.parse({ crop })).toEqual({ crop });
    expect(updateMediaInputSchema.parse({ crop: null })).toEqual({ crop: null });
  });
});

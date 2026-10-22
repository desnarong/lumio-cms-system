import { translateNow } from '@lumio/ui';
import { COLOR_PALETTES, type BrandPalette, type MediaItem } from '@lumio/shared';
import { ApiError } from '../editor/api.js';
import { checkUploadCandidate, mimeFromFilename, type MediaApi, type MediaListQuery } from './api.js';

/** A tiny inline swatch so the demo library looks like a real one. */
const swatch = (top: string, bottom: string, label: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400" role="img" aria-label="${label}">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/>` +
      `</linearGradient></defs><rect width="640" height="400" fill="url(#g)"/>` +
      `<text x="32" y="356" fill="#ffffff" font-family="system-ui" font-size="28">${label}</text></svg>`,
  )}`;

const demoItem = (
  id: string,
  filename: string,
  folder: string,
  alt: string,
  label: string,
  colors: [string, string],
  createdAt: string,
): MediaItem => ({
  id,
  url: swatch(colors[0], colors[1], label),
  srcSet: null,
  filename,
  mime: 'image/png',
  sizeBytes: 184_320,
  width: 640,
  height: 400,
  alt,
  folder,
  focalPoint: null,
  variants: [],
  status: 'ready',
  createdAt,
  updatedAt: createdAt,
});

const demoSeed = (): MediaItem[] => [
  demoItem(
    'demo-media-hero',
    'shop-front.png',
    'hero',
    'บรรยากาศหน้าร้านกาแฟบ้านดอย',
    'หน้าร้าน',
    ['#8d5a3b', '#2f2118'],
    '2026-10-18T09:12:00.000Z',
  ),
  demoItem(
    'demo-media-logo',
    'logo.png',
    'brand',
    'โลโก้กาแฟบ้านดอย',
    'โลโก้',
    ['#3f7d5a', '#14342a'],
    '2026-10-16T14:02:00.000Z',
  ),
  demoItem(
    'demo-media-beans',
    'beans.png',
    'product',
    'เมล็ดกาแฟคั่วสดจากดอยช้าง',
    'เมล็ดกาแฟ',
    ['#c9793c', '#5b2f16'],
    '2026-10-14T11:30:00.000Z',
  ),
  demoItem(
    'demo-media-team',
    'team.png',
    'team',
    'ทีมงานร้านกาแฟบ้านดอย',
    'ทีมงาน',
    ['#6b7280', '#1f2937'],
    '2026-10-11T08:45:00.000Z',
  ),
];

const matches = (item: MediaItem, query: MediaListQuery): boolean => {
  const term = query.q?.trim().toLowerCase();
  if (query.folder && item.folder !== query.folder) return false;
  if (!term) return true;
  return (
    (item.filename ?? '').toLowerCase().includes(term) ||
    (item.alt ?? '').toLowerCase().includes(term)
  );
};

/**
 * In-memory media library so the editor and the library screens work before the
 * API is configured. It keeps the same contracts as the HTTP client: presign →
 * upload → confirm collapses into one call, deletes are soft, and `restore`
 * brings an image back for the undo toast.
 */
export const createDemoMediaApi = (): MediaApi => {
  let items = demoSeed();
  const trashed = new Map<string, MediaItem>();
  let counter = 0;

  return {
    list: async (query = {}) => ({
      items: items.filter((item) => matches(item, query)),
      cursor: null,
    }),

    folders: async () =>
      [...new Set(items.map((item) => item.folder).filter((f): f is string => Boolean(f)))].sort(
        (a, b) => a.localeCompare(b, 'th'),
      ),

    upload: async (file, options) => {
      const invalid = checkUploadCandidate(file);
      if (invalid) throw new ApiError('validation_error', invalid, 400);

      counter += 1;
      const now = new Date().toISOString();
      const id = `demo-media-${counter}-${Date.now().toString(36)}`;
      const canPreview =
        typeof Blob !== 'undefined' &&
        file instanceof Blob &&
        typeof URL !== 'undefined' &&
        typeof URL.createObjectURL === 'function';
      const preview = canPreview
        ? URL.createObjectURL(file)
        : swatch('#475569', '#0f172a', 'รูปใหม่');

      const item: MediaItem = {
        id,
        url: preview,
        srcSet: null,
        filename: file.name,
        mime: mimeFromFilename(file.name) ?? 'image/jpeg',
        sizeBytes: file.size,
        width: null,
        height: null,
        alt: '',
        folder: options?.folder ?? null,
        focalPoint: null,
        variants: [],
        status: 'processing',
        createdAt: now,
        updatedAt: now,
      };
      items = [item, ...items];
      return item;
    },

    update: async (id, input) => {
      const current = items.find((item) => item.id === id);
      if (!current) throw new ApiError('not_found', translateNow('demo.mediaNotFound'), 404);

      const updated: MediaItem = {
        ...current,
        ...(input.alt === undefined ? {} : { alt: input.alt }),
        ...(input.folder === undefined ? {} : { folder: input.folder }),
        ...(input.focalPoint === undefined ? {} : { focalPoint: input.focalPoint }),
        ...(input.crop === undefined ? {} : { crop: input.crop }),
        updatedAt: new Date().toISOString(),
      };
      items = items.map((item) => (item.id === id ? updated : item));
      return updated;
    },

    bulkUpdate: async (input) => {
      const selected = new Set(input.ids);
      const altById = new Map((input.alt ?? []).map((entry) => [entry.id, entry.alt]));
      items = items.map((item) =>
        selected.has(item.id)
          ? {
              ...item,
              ...(input.folder === undefined ? {} : { folder: input.folder }),
              ...(altById.has(item.id) ? { alt: altById.get(item.id) ?? null } : {}),
              updatedAt: new Date().toISOString(),
            }
          : item,
      );
      const changed = items.filter((item) => selected.has(item.id));
      return { count: changed.length, items: changed };
    },

    remove: async (id) => {
      const current = items.find((item) => item.id === id);
      if (!current) return;
      items = items.filter((item) => item.id !== id);
      trashed.set(id, current);
    },

    restore: async (id) => {
      const current = trashed.get(id);
      if (!current) throw new ApiError('not_found', translateNow('demo.mediaNotFound'), 404);
      trashed.delete(id);
      items = [current, ...items];
      return current;
    },

    /** Deterministic stand-in: each demo image maps to one of the ready palettes. */
    palette: async (id) => {
      const current = items.find((item) => item.id === id);
      if (!current) throw new ApiError('not_found', translateNow('demo.mediaNotFound'), 404);

      const seed = [...id].reduce((total, char) => total + char.charCodeAt(0), 0);
      const palette = COLOR_PALETTES[seed % COLOR_PALETTES.length] ?? COLOR_PALETTES[0];
      return {
        primary: palette?.primary ?? '#4F46E5',
        accent: palette?.accent ?? '#F472B6',
        swatches: [
          { hex: palette?.primary ?? '#4F46E5', share: 0.62 },
          { hex: palette?.accent ?? '#F472B6', share: 0.38 },
        ],
        fromLogo: true,
      } satisfies BrandPalette;
    },
  };
};
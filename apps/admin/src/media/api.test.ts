import { describe, expect, it, vi } from 'vitest';
import { MEDIA_MAX_UPLOAD_BYTES, type MediaItem } from '@lumio/shared';
import {
  checkUploadCandidate,
  createHttpMediaApi,
  mimeFromFilename,
  type MediaApi,
} from './api.js';
import { createDemoMediaApi } from './demo.js';

const mediaRow = (overrides: Partial<MediaItem> = {}): MediaItem => ({
  id: 'media-1',
  url: 'http://localhost:49100/media/site/a-1024.webp',
  srcSet: 'http://localhost:49100/media/site/a-480.webp 480w',
  filename: 'hero.jpg',
  mime: 'image/jpeg',
  sizeBytes: 2048,
  width: 1600,
  height: 900,
  alt: 'หน้าร้าน',
  folder: 'hero',
  focalPoint: null,
  variants: [],
  status: 'ready',
  createdAt: '2026-10-20T00:00:00.000Z',
  updatedAt: '2026-10-20T00:00:00.000Z',
  ...overrides,
});

const jsonResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status < 400,
    status,
    json: async () => body,
  }) as unknown as Response;

const file = (name = 'hero.jpg', type = 'image/jpeg', size = 4096): File =>
  ({ name, type, size }) as unknown as File;

describe('checkUploadCandidate', () => {
  it('accepts the formats the library supports', () => {
    expect(checkUploadCandidate(file())).toBeNull();
  });

  it('explains why a file is refused before it is uploaded', () => {
    expect(checkUploadCandidate(file('logo.svg', 'image/svg+xml'))).toContain('JPG');
    expect(checkUploadCandidate(file('big.png', 'image/png', MEDIA_MAX_UPLOAD_BYTES + 1))).toContain(
      'ใหญ่เกิน',
    );
    expect(checkUploadCandidate(file('empty.png', 'image/png', 0))).toContain('ว่างเปล่า');
  });

  it('falls back to the extension when the browser reports no mime type', () => {
    expect(mimeFromFilename('photo.WEBP')).toBe('image/webp');
    expect(mimeFromFilename('archive.zip')).toBeNull();
    expect(checkUploadCandidate(file('photo.avif', ''))).toBeNull();
  });
});

describe('brand palette', () => {
  it('asks the API for the colours of one logo and returns them', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        data: {
          primary: '#1D4ED8',
          accent: '#F97316',
          swatches: [{ hex: '#1D4ED8', share: 0.7 }],
          fromLogo: true,
        },
      }),
    );

    const palette = await createHttpMediaApi({
      baseUrl: 'http://localhost:49100',
      getAccessToken: () => 'token-1',
      getSiteId: () => 'site-1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    }).palette('media-1');

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:49100/api/v1/media/media-1/palette');
    expect(init.method).toBe('POST');
    expect(palette).toMatchObject({ primary: '#1D4ED8', accent: '#F97316', fromLogo: true });
  });

  it('gives the demo wizard a palette for any uploaded image', async () => {
    const api = createDemoMediaApi();
    const palette = await api.palette('demo-media-logo');

    expect(palette.fromLogo).toBe(true);
    expect(palette.primary).toMatch(/^#[0-9A-F]{6}$/);
    await expect(api.palette('missing')).rejects.toThrow();
  });
});

describe('createHttpMediaApi', () => {
  it('runs presign → upload → confirm and returns the library row', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = vi.fn(async (url: string, init: RequestInit = {}) => {
      calls.push({ url, init });
      if (String(url).endsWith('/media/presign')) {
        return jsonResponse({
          data: {
            mediaId: 'media-1',
            uploadUrl: 'https://storage.example.com/signed',
            method: 'PUT',
            headers: { 'content-type': 'image/jpeg' },
            expiresAt: '2026-10-20T00:15:00.000Z',
            maxBytes: MEDIA_MAX_UPLOAD_BYTES,
          },
        });
      }
      if (String(url) === 'https://storage.example.com/signed') return jsonResponse({}, 200);
      return jsonResponse({ data: mediaRow() });
    });

    const api = createHttpMediaApi({
      baseUrl: 'http://localhost:49100',
      getAccessToken: () => 'token-1',
      getSiteId: () => 'site-1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const item = await api.upload(file(), { folder: 'hero' });

    expect(item).toMatchObject({ id: 'media-1', alt: 'หน้าร้าน', srcSet: expect.any(String) });

    const presignBody = JSON.parse(String(calls[0]?.init.body)) as Record<string, unknown>;
    expect(presignBody).toMatchObject({ filename: 'hero.jpg', mime: 'image/jpeg', size: 4096 });

    // The signed URL is the only authority for the upload: no session headers.
    const uploadHeaders = calls[1]?.init.headers as Record<string, string>;
    expect(uploadHeaders['content-type']).toBe('image/jpeg');
    expect(uploadHeaders.authorization).toBeUndefined();
    expect(uploadHeaders['x-site-id']).toBeUndefined();

    // Confirming sends the site so the row is scoped correctly.
    const confirmHeaders = calls[2]?.init.headers as Record<string, string>;
    expect(confirmHeaders['x-site-id']).toBe('site-1');
    expect(confirmHeaders.authorization).toBe('Bearer token-1');
  });

  it('refuses a file the browser labels with an unsupported type', async () => {
    const fetchImpl = vi.fn();
    const api = createHttpMediaApi({
      baseUrl: '',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(api.upload(file('script.svg', 'image/svg+xml'))).rejects.toThrow(/JPG/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('stops when the upload itself fails', async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (String(url).endsWith('/media/presign')) {
        return jsonResponse({
          data: {
            mediaId: 'media-1',
            uploadUrl: 'https://storage.example.com/signed',
            method: 'PUT',
            headers: {},
            expiresAt: '2026-10-20T00:15:00.000Z',
            maxBytes: MEDIA_MAX_UPLOAD_BYTES,
          },
        });
      }
      return jsonResponse({}, 500);
    });

    const api = createHttpMediaApi({
      baseUrl: '',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(api.upload(file())).rejects.toThrow(/อัปโหลดไฟล์ไม่สำเร็จ/);
  });

  it('surfaces the API Thai message when listing fails', async () => {
    const api = createHttpMediaApi({
      baseUrl: '',
      fetchImpl: (async () =>
        jsonResponse({ error: 'forbidden', message: 'คุณไม่มีสิทธิ์ทำรายการนี้' }, 403)) as never,
    });

    await expect(api.list()).rejects.toThrow(/ไม่มีสิทธิ์/);
  });

  it('sends the cursor, search and folder filters as query parameters', async () => {
    const seen: string[] = [];
    const api = createHttpMediaApi({
      baseUrl: 'http://localhost:49100',
      getSiteId: () => 'site-1',
      fetchImpl: (async (url: string) => {
        seen.push(String(url));
        return jsonResponse({ data: [mediaRow()], meta: { cursor: 'media-1' } });
      }) as never,
    });

    const page = await api.list({ q: 'hero', folder: 'hero', cursor: 'media-9', limit: 12 });

    expect(page.cursor).toBe('media-1');
    expect(seen[0]).toBe('http://localhost:49100/api/v1/media?q=hero&folder=hero&cursor=media-9&limit=12');
  });

  it('reads the folder list and restores a trashed image', async () => {
    const api = createHttpMediaApi({
      baseUrl: '',
      fetchImpl: (async (url: string) =>
        String(url).endsWith('/folders')
          ? jsonResponse({ data: { folders: ['brand', 'hero'] } })
          : jsonResponse({ data: mediaRow() })) as never,
    });

    expect(await api.folders()).toEqual(['brand', 'hero']);
    expect((await api.restore('media-1')).id).toBe('media-1');
  });
});

describe('createDemoMediaApi', () => {
  const api: MediaApi = createDemoMediaApi();

  it('seeds a browsable library with folders', async () => {
    const page = await api.list();
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.cursor).toBeNull();
    expect(await api.folders()).toEqual(expect.arrayContaining(['brand', 'hero', 'product', 'team']));
  });

  it('filters by folder and search term', async () => {
    expect((await api.list({ folder: 'hero' })).items).toHaveLength(1);
    expect((await api.list({ q: 'โลโก้' })).items).toHaveLength(1);
    expect((await api.list({ q: 'ไม่มีทางพบ' })).items).toHaveLength(0);
  });

  it('validates an upload before accepting it', async () => {
    await expect(api.upload(file('logo.svg', 'image/svg+xml'))).rejects.toThrow(/JPG/);
  });

  it('adds, edits, deletes and restores an image', async () => {
    const uploads = createDemoMediaApi();
    const created = await uploads.upload(file('new-shot.jpg'));

    expect(created).toMatchObject({ filename: 'new-shot.jpg', status: 'processing' });
    const withAlt = await uploads.update(created.id, { alt: 'รูปใหม่', folder: 'hero' });
    expect(withAlt).toMatchObject({ alt: 'รูปใหม่', folder: 'hero' });

    await uploads.remove(created.id);
    expect((await uploads.list()).items.some((item) => item.id === created.id)).toBe(false);

    const restored = await uploads.restore(created.id);
    expect(restored.id).toBe(created.id);
    expect((await uploads.list()).items[0]?.id).toBe(created.id);
  });

  it('cannot restore something that was never deleted', async () => {
    await expect(api.restore('missing')).rejects.toThrow(/ไม่พบรูปนี้/);
  });
});
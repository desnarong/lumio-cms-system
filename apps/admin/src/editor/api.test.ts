import { describe, expect, it, vi } from 'vitest';
import { ApiError, createHttpContentApi } from './api.js';

const jsonResponse = (body: unknown, status = 200): Response =>
  ({ ok: status < 400, status, json: async () => body }) as unknown as Response;

const brokenResponse = (status: number): Response =>
  ({
    ok: false,
    status,
    json: async () => {
      throw new Error('not json');
    },
  }) as unknown as Response;

const buildApi = (fetchImpl: ReturnType<typeof vi.fn>, overrides: Record<string, unknown> = {}) =>
  createHttpContentApi({
    baseUrl: 'http://api.test',
    getAccessToken: () => 'token-1',
    getSiteId: () => 'site-1',
    fetchImpl: fetchImpl as unknown as typeof fetch,
    ...overrides,
  });

describe('createHttpContentApi', () => {
  it('sends the access token and the site header', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'c1' } }));
    await buildApi(fetchImpl).getContent('c1');

    const [url, init] = fetchImpl.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(url).toBe('http://api.test/api/v1/contents/c1');
    expect(init.headers.authorization).toBe('Bearer token-1');
    expect(init.headers['x-site-id']).toBe('site-1');
  });

  it('puts the block tree and base revision in the autosave body', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: { revision: 5, savedAt: '2026-10-20T08:00:00Z' } }));

    const result = await buildApi(fetchImpl).saveBlocks('c1', { blocks: [], baseRevision: 4 });

    const [, init] = fetchImpl.mock.calls[0] as [string, { method: string; body: string }];
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ blocks: [], baseRevision: 4 });
    expect(result.revision).toBe(5);
  });

  it('turns a 409 into a conflict error the editor can act on', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: 'conflict', message: 'มีคนอื่นแก้หน้านี้ไปแล้ว' }, 409));

    await expect(buildApi(fetchImpl).saveBlocks('c1', { blocks: [], baseRevision: 1 })).rejects.toMatchObject({
      code: 'conflict',
      message: 'มีคนอื่นแก้หน้านี้ไปแล้ว',
      status: 409,
    });
  });

  it('marks the conflict error so the editor can offer an overwrite', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: 'conflict', message: 'ชนกัน' }, 409));

    const error = await buildApi(fetchImpl)
      .saveBlocks('c1', { blocks: [], baseRevision: 1 })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).isConflict).toBe(true);
  });

  it('falls back to a human message when the error body is not JSON', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(brokenResponse(500));

    await expect(buildApi(fetchImpl).getContent('c1')).rejects.toMatchObject({
      code: 'internal_error',
      message: 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ ลองอีกครั้ง',
    });
  });

  it('posts when publishing and restoring', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { revision: 1 } }));
    const api = buildApi(fetchImpl);

    await api.publish('c1');
    await api.restoreVersion('c1', 'v1');

    expect((fetchImpl.mock.calls[0] as [string])[0]).toBe('http://api.test/api/v1/contents/c1/publish');
    expect((fetchImpl.mock.calls[1] as [string])[0]).toBe(
      'http://api.test/api/v1/contents/c1/restore/v1',
    );
  });

  it('reads the version list from the envelope', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: [{ id: 'v1', note: null, createdAt: 'x', authorId: null }] }));

    const versions = await buildApi(fetchImpl).listVersions('c1');

    expect(versions).toHaveLength(1);
  });

  it('reads one version with its blocks for the preview', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: { id: 'v1', blocks: [], blockCount: 0 } }));

    await buildApi(fetchImpl).getVersion('c1', 'v1');

    expect((fetchImpl.mock.calls[0] as [string])[0]).toBe(
      'http://api.test/api/v1/contents/c1/versions/v1',
    );
  });

  it('posts a named version so the history reads clearly', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'v2' } }));

    await buildApi(fetchImpl).createVersion('c1', { note: 'ก่อนแก้ราคา' });

    const [url, init] = fetchImpl.mock.calls[0] as [string, { method: string; body: string }];
    expect(url).toBe('http://api.test/api/v1/contents/c1/versions');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ note: 'ก่อนแก้ราคา' });
  });

  it('posts to the trash restore endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'c1' } }));

    await buildApi(fetchImpl).restore('c1');

    const [url, init] = fetchImpl.mock.calls[0] as [string, { method: string }];
    expect(url).toBe('http://api.test/api/v1/contents/c1/restore');
    expect(init.method).toBe('POST');
  });

  it('reads the languages of a page', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: { groupId: 'g1', defaultLocale: 'th', items: [] } }));

    await buildApi(fetchImpl).translations('c1');

    expect((fetchImpl.mock.calls[0] as [string])[0]).toBe(
      'http://api.test/api/v1/contents/c1/translations',
    );
  });

  it('posts a translation request with the target language', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'c2', locale: 'en' } }));

    await buildApi(fetchImpl).createTranslation('c1', { locale: 'en', translate: true });

    const [url, init] = fetchImpl.mock.calls[0] as [string, { method: string; body: string }];
    expect(url).toBe('http://api.test/api/v1/contents/c1/translate');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ locale: 'en', translate: true });
  });

  it('sends the locale filter with the content list query', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));

    await buildApi(fetchImpl).list({ locale: 'en' });

    expect((fetchImpl.mock.calls[0] as [string])[0]).toContain('locale=en');
  });

  it('posts to the translate-content endpoint with the missing-text option', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: { translatedCount: 2, totalCount: 3, blocks: [] } }));

    const result = await buildApi(fetchImpl).translateContent('c1', { onlyMissing: true });

    const [url, init] = fetchImpl.mock.calls[0] as [string, { method: string; body: string }];
    expect(url).toBe('http://api.test/api/v1/contents/c1/translate-content');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ onlyMissing: true });
    expect(result).toEqual({ translatedCount: 2, totalCount: 3, blocks: [] });
  });
});

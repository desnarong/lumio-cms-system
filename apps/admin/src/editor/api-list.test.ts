import { describe, expect, it, vi } from 'vitest';
import { createHttpContentApi } from './api.js';

const jsonResponse = (body: unknown, status = 200): Response =>
  ({ ok: status < 400, status, json: async () => body }) as unknown as Response;

const buildApi = (fetchImpl: ReturnType<typeof vi.fn>) =>
  createHttpContentApi({
    baseUrl: 'http://api.test',
    getAccessToken: () => 'token-1',
    getSiteId: () => 'site-1',
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });

describe('content list calls', () => {
  it('reads a page of content together with its cursor', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ data: [{ id: 'c1', title: 'เมนูร้าน' }], meta: { cursor: 'next-1' } }),
    );

    const page = await buildApi(fetchImpl).list({ type: 'page', status: 'draft', q: 'เมนู' });

    const [url] = fetchImpl.mock.calls[0] as [string];
    expect(url).toContain('/api/v1/contents?');
    expect(url).toContain('type=page');
    expect(url).toContain('status=draft');
    expect(url).toContain('q=%E0%B9%80%E0%B8%A1%E0%B8%99%E0%B8%B9');
    expect(page.items).toHaveLength(1);
    expect(page.cursor).toBe('next-1');
  });

  it('defaults to an empty cursor when the API sends no meta', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    const page = await buildApi(fetchImpl).list({ type: 'post' });
    expect(page.cursor).toBeNull();
  });

  it('creates a page with POST', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'c9', title: 'ใหม่' } }));

    await buildApi(fetchImpl).create({
      type: 'page',
      title: 'ใหม่',
      slug: 'new',
      locale: 'th',
      blocks: [],
      seo: { noindex: false },
    });

    const [url, init] = fetchImpl.mock.calls[0] as [string, { method: string; body: string }];
    expect(url).toBe('http://api.test/api/v1/contents');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body).slug).toBe('new');
  });

  it('patches a status change and deletes by id', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { success: true } }));
    const api = buildApi(fetchImpl);

    await api.update('c1', { status: 'archived' });
    await api.remove('c1');

    const [patchUrl, patchInit] = fetchImpl.mock.calls[0] as [string, { method: string; body: string }];
    expect(patchUrl).toBe('http://api.test/api/v1/contents/c1');
    expect(patchInit.method).toBe('PATCH');
    expect(JSON.parse(patchInit.body)).toEqual({ status: 'archived' });

    const [deleteUrl, deleteInit] = fetchImpl.mock.calls[1] as [string, { method: string }];
    expect(deleteUrl).toBe('http://api.test/api/v1/contents/c1');
    expect(deleteInit.method).toBe('DELETE');
  });
});

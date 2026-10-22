import { describe, expect, it, vi } from 'vitest';
import { createHttpDesignApi } from './api.js';

const jsonResponse = (body: unknown, status = 200): Response =>
  ({ ok: status < 400, status, json: async () => body }) as unknown as Response;

const buildApi = (fetchImpl: ReturnType<typeof vi.fn>) =>
  createHttpDesignApi({
    baseUrl: 'http://api.test',
    getAccessToken: () => 'token-1',
    getSiteId: () => 'site-1',
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });

describe('createHttpDesignApi', () => {
  it('reads and patches design tokens', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { tokens: {} } }));
    const api = buildApi(fetchImpl);

    await api.getTokens();
    await api.updateTokens({ colors: { primary: '#4F46E5' } });
    await api.resetTokens();

    expect((fetchImpl.mock.calls[0] as [string])[0]).toBe('http://api.test/api/v1/design/tokens');
    const [patchUrl, patchInit] = fetchImpl.mock.calls[1] as [string, { method: string; body: string }];
    expect(patchUrl).toBe('http://api.test/api/v1/design/tokens');
    expect(patchInit.method).toBe('PATCH');
    expect(JSON.parse(patchInit.body)).toEqual({ colors: { primary: '#4F46E5' } });
    expect((fetchImpl.mock.calls[2] as [string, { method: string }])[1].method).toBe('POST');
  });

  it('applies a template with the header/footer choice', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { tokens: {} } }));

    await buildApi(fetchImpl).applyTemplate('tpl-1', { applyHeaderFooter: true });

    const [url, init] = fetchImpl.mock.calls[0] as [string, { method: string; body: string }];
    expect(url).toBe('http://api.test/api/v1/design/template/tpl-1/apply');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ applyHeaderFooter: true });
  });

  it('reads and writes menus', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { location: 'header', items: [] } }));
    const api = buildApi(fetchImpl);

    await api.getMenu('header');
    await api.updateMenu('footer', { items: [{ label: 'ติดต่อ', children: [] }] });

    expect((fetchImpl.mock.calls[0] as [string])[0]).toBe('http://api.test/api/v1/menus/header');
    const [url, init] = fetchImpl.mock.calls[1] as [string, { method: string; body: string }];
    expect(url).toBe('http://api.test/api/v1/menus/footer');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body).items).toHaveLength(1);
  });

  it('reads and writes a global block by kind', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { header: [], footer: [] } }));
    const api = buildApi(fetchImpl);

    await api.getGlobalBlocks();
    await api.updateGlobalBlock('header', []);

    expect((fetchImpl.mock.calls[0] as [string])[0]).toBe('http://api.test/api/v1/global-blocks');
    const [url, init] = fetchImpl.mock.calls[1] as [string, { method: string; body: string }];
    expect(url).toBe('http://api.test/api/v1/global-blocks/header');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ blocks: [] });
  });

  it('manages saved sections', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { success: true } }));
    const api = buildApi(fetchImpl);

    await api.listSections();
    await api.createSection({ name: 'ฮีโร่', blocks: [] });
    await api.renameSection('s1', { name: 'ใหม่' });
    await api.removeSection('s1');

    expect((fetchImpl.mock.calls[1] as [string, { method: string }])[1].method).toBe('POST');
    const [renameUrl, renameInit] = fetchImpl.mock.calls[2] as [string, { method: string }];
    expect(renameUrl).toBe('http://api.test/api/v1/section-templates/s1');
    expect(renameInit.method).toBe('PATCH');
    expect((fetchImpl.mock.calls[3] as [string, { method: string }])[1].method).toBe('DELETE');
  });
});

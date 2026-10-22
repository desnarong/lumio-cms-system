import { describe, expect, it, vi } from 'vitest';
import { createHttpSettingsApi } from './api.js';

const jsonResponse = (body: unknown, status = 200): Response =>
  ({ ok: status < 400, status, json: async () => body }) as unknown as Response;

const buildApi = (fetchImpl: ReturnType<typeof vi.fn>, siteId: string | null = 'site-1') =>
  createHttpSettingsApi({
    baseUrl: 'http://api.test',
    getAccessToken: () => 'token-1',
    getSiteId: () => siteId,
    fetchImpl: fetchImpl as unknown as typeof fetch,
  });

describe('createHttpSettingsApi', () => {
  it('reads and updates the site', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'site-1' } }));
    const api = buildApi(fetchImpl);

    await api.getSite();
    await api.updateSite({ name: 'กาแฟบ้านดอย' });

    expect((fetchImpl.mock.calls[0] as [string])[0]).toBe('http://api.test/api/v1/sites/site-1');
    const [url, init] = fetchImpl.mock.calls[1] as [string, { method: string; body: string }];
    expect(url).toBe('http://api.test/api/v1/sites/site-1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ name: 'กาแฟบ้านดอย' });
  });

  it('manages domains under the site', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { items: [], cnameTarget: 'x' } }));
    const api = buildApi(fetchImpl);

    await api.listDomains();
    await api.addDomain({ hostname: 'baandoi.com', isPrimary: false });
    await api.verifyDomain('d1');
    await api.removeDomain('d1');

    const calls = fetchImpl.mock.calls as [string, { method: string }][];
    expect(calls[0]![0]).toBe('http://api.test/api/v1/sites/site-1/domains');
    expect(calls[1]![0]).toBe('http://api.test/api/v1/sites/site-1/domains');
    expect(calls[1]![1].method).toBe('POST');
    expect(calls[2]![0]).toBe('http://api.test/api/v1/sites/site-1/domains/d1/verify');
    expect(calls[3]![1].method).toBe('DELETE');
  });

  it('reads members from the envelope and manages their roles', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: [{ userId: 'u1', role: 'editor' }] }));
    const api = buildApi(fetchImpl);

    const members = await api.listMembers();
    await api.inviteMember({ email: 'e@example.com', role: 'editor' });
    await api.updateMemberRole('u1', { role: 'admin' });
    await api.removeMember('u1');

    expect(members).toHaveLength(1);
    const calls = fetchImpl.mock.calls as [string, { method?: string; body?: string }][];
    expect(calls[0]![0]).toContain('/api/v1/members?limit=100');
    expect(calls[1]![1].method).toBe('POST');
    expect(calls[2]![0]).toBe('http://api.test/api/v1/members/u1');
    expect(calls[2]![1].method).toBe('PATCH');
    expect(calls[3]![1].method).toBe('DELETE');
  });

  it('refuses to call the API without a site instead of requesting /sites/null', async () => {
    const fetchImpl = vi.fn();

    await expect(buildApi(fetchImpl, null).getSite()).rejects.toMatchObject({
      code: 'validation_error',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('lists the trash and restores or purges a page', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: [] }));
    const api = buildApi(fetchImpl);

    await api.listTrash();
    await api.restoreFromTrash('c1');
    await api.purgeFromTrash('c1');

    const calls = fetchImpl.mock.calls as [string, { method?: string }][];
    expect(calls[0]![0]).toContain('/api/v1/contents?status=archived');
    expect(calls[1]![0]).toBe('http://api.test/api/v1/contents/c1/restore');
    expect(calls[1]![1].method).toBe('POST');
    expect(calls[2]![0]).toBe('http://api.test/api/v1/contents/c1');
    expect(calls[2]![1].method).toBe('DELETE');
  });

  it('manages redirects for the current site', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { items: [] } }));
    const api = buildApi(fetchImpl);

    await api.listRedirects();
    await api.createRedirect({ fromPath: '/old', toPath: '/new', code: 301 });
    await api.updateRedirect({ fromPath: '/old', toPath: '/newer', code: 302 });
    await api.removeRedirect('/old/page');

    const calls = fetchImpl.mock.calls as [string, { method?: string; body?: string }][];
    expect(calls[0]![0]).toBe('http://api.test/api/v1/redirects');
    expect(calls[1]![1].method).toBe('POST');
    expect(JSON.parse(calls[1]![1].body ?? '{}')).toEqual({
      fromPath: '/old',
      toPath: '/new',
      code: 301,
    });
    expect(calls[2]![1].method).toBe('PATCH');
    expect(calls[3]![0]).toBe('http://api.test/api/v1/redirects?from=%2Fold%2Fpage');
    expect(calls[3]![1].method).toBe('DELETE');
  });
});

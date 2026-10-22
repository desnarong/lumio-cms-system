import { describe, expect, it, vi } from 'vitest';
import { createDemoWizardApi } from './demo.js';
import { createHttpWizardApi } from './api.js';

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('createHttpWizardApi', () => {
  it('lists templates and sites with the bearer token', async () => {
    const fetchImpl = vi.fn(async (url: string, _init?: RequestInit) =>
      jsonResponse({ data: url.includes('templates') ? [{ id: 't1' }] : [{ id: 's1' }] }),
    );
    const api = createHttpWizardApi({
      baseUrl: 'http://api.test',
      getAccessToken: () => 'token-1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(await api.listTemplates()).toEqual([{ id: 't1' }]);
    expect(await api.listSites()).toEqual([{ id: 's1' }]);

    const first = fetchImpl.mock.calls[0];
    expect(first?.[0]).toBe('http://api.test/api/v1/templates');
    expect((first?.[1]?.headers as Record<string, string>).authorization).toBe('Bearer token-1');
  });

  it('creates the site with the wizard answers', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({ data: { siteId: 's1', name: 'ร้านกาแฟของฉัน', pages: [], published: 0 } }),
    );
    const api = createHttpWizardApi({
      baseUrl: 'http://api.test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await api.createSite({
      businessType: 'restaurant',
      name: 'ร้านกาแฟของฉัน',
      subdomain: 'my-cafe',
      locales: [],
      localeDefault: 'th',
      styleId: 'soft',
      primaryColor: '#8B5E3C',
      publishNow: true,
    });

    expect(result.siteId).toBe('s1');
    const call = fetchImpl.mock.calls[0];
    expect(call?.[0]).toBe('http://api.test/api/v1/sites');
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
      subdomain: 'my-cafe',
      styleId: 'soft',
    });
  });
});

describe('locale status', () => {
  it('asks the API how the background languages are doing', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        data: {
          defaultLocale: 'th',
          locales: [
            {
              locale: 'en',
              status: 'running',
              pages: 4,
              done: 2,
              translated: true,
              error: null,
              updatedAt: '2026-10-22T00:00:00.000Z',
            },
          ],
        },
      }),
    );
    const api = createHttpWizardApi({
      baseUrl: 'http://api.test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const status = await api.localeStatus('site-1');

    expect(fetchImpl.mock.calls[0]?.[0]).toBe('http://api.test/api/v1/sites/site-1/locales');
    expect(status.locales[0]).toMatchObject({ locale: 'en', status: 'running', done: 2 });
  });
});

describe('createDemoWizardApi', () => {
  it('ships the template packs the wizard offers', async () => {
    const templates = await createDemoWizardApi().listTemplates();

    expect(templates.length).toBeGreaterThanOrEqual(3);
    for (const type of ['restaurant', 'clinic', 'freelance', 'shop']) {
      expect(templates.map((template) => template.businessType)).toContain(type);
    }
    expect(templates.map((template) => template.name)).toContain('บี-ไลท์ติ้ง');
    for (const template of templates) {
      expect(template.pages.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('builds the sample pages of the chosen business type', async () => {
    const api = createDemoWizardApi();

    const created = await api.createSite({
      businessType: 'clinic',
      name: 'คลินิกของฉัน',
      subdomain: 'my-clinic',
      locales: [],
      localeDefault: 'th',
      styleId: 'minimal',
      primaryColor: '#0E7490',
      publishNow: true,
    });

    expect(created.published).toBe(created.pages.length);
    expect(created.pages.map((page) => page.slug)).toContain('home');
    expect(await api.listSites()).toHaveLength(1);
  });

  it('refuses a subdomain that is already used', async () => {
    const api = createDemoWizardApi();
    const input = {
      businessType: 'restaurant' as const,
      name: 'ร้านแรก',
      subdomain: 'my-cafe',
      locales: [],
      localeDefault: 'th',
      styleId: 'soft' as const,
      primaryColor: '#8B5E3C',
      publishNow: true,
    };

    await api.createSite(input);
    await expect(api.createSite({ ...input, name: 'ร้านที่สอง' })).rejects.toMatchObject({
      code: 'conflict',
    });
  });
});

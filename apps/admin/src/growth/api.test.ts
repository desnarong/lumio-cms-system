import { describe, expect, it, vi } from 'vitest';
import type { AiProposal, ContentDetail } from '@lumio/shared';
import type { AiApi } from '../ai/api.js';
import type { ContentApi } from '../editor/api.js';
import {
  createHttpAnalyticsApi,
  createHttpAppsApi,
  createHttpNewsletterApi,
  createHttpSeoApi,
  type HttpGrowthApiConfig,
} from './api.js';

const jsonResponse = (body: unknown, status = 200): Response =>
  ({ ok: status < 400, status, json: async () => body }) as unknown as Response;

const config = (fetchImpl: ReturnType<typeof vi.fn>): HttpGrowthApiConfig => ({
  baseUrl: 'http://api.test',
  getAccessToken: () => 'token-1',
  getSiteId: () => 'site-1',
  fetchImpl: fetchImpl as unknown as typeof fetch,
});

const call = (fetchImpl: ReturnType<typeof vi.fn>, index = 0) =>
  fetchImpl.mock.calls[index] as [string, { method?: string; headers: Record<string, string>; body?: string }];

const metaProposal: AiProposal = {
  id: 'ai-1',
  action: 'seo',
  label: 'ชื่อเรื่องและคำอธิบาย',
  summary: 'ร่างให้ 2 ข้อความ',
  provider: 'local',
  changes: [
    { field: 'title', label: 'ชื่อเรื่อง', before: '', after: 'บริการซ่อมรถยนต์' },
    { field: 'description', label: 'คำอธิบาย', before: '', after: 'ซ่อมรถทุกยี่ห้อ' },
  ],
};

const aiStub = (proposal: AiProposal): AiApi =>
  ({ seo: vi.fn().mockResolvedValue({ proposal, usage: {} }) }) as unknown as AiApi;

const contentStub = (): ContentApi =>
  ({
    getContent: vi.fn().mockResolvedValue({
      id: 'p2',
      seo: { title: '', description: '', noindex: true },
    } as unknown as ContentDetail),
    updateSeo: vi.fn().mockResolvedValue({} as ContentDetail),
  }) as unknown as ContentApi;

describe('createHttpSeoApi', () => {
  it('reads the SEO report with the site header', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { score: 78 } }));
    const health = await createHttpSeoApi({
      ...config(fetchImpl),
      ai: aiStub(metaProposal),
      content: contentStub(),
    }).getHealth();

    const [url, init] = call(fetchImpl);
    expect(url).toBe('http://api.test/api/v1/seo/health');
    expect(init.headers['x-site-id']).toBe('site-1');
    expect(init.headers.authorization).toBe('Bearer token-1');
    expect(health).toEqual({ score: 78 });
  });

  it('asks the assistant for one page and returns its proposal', async () => {
    const ai = aiStub(metaProposal);

    const proposal = await createHttpSeoApi({
      ...config(vi.fn()),
      ai,
      content: contentStub(),
    }).suggestMeta('p2');

    expect(ai.seo).toHaveBeenCalledWith({ pageId: 'p2' });
    expect(proposal.changes[0]?.after).toBe('บริการซ่อมรถยนต์');
  });

  it('saves only the two meta texts and reports what they replaced', async () => {
    const fetchImpl = vi.fn();
    const content = contentStub();

    const saved = await createHttpSeoApi({
      ...config(fetchImpl),
      ai: aiStub(metaProposal),
      content,
    }).saveMeta('p2', { title: 'บริการซ่อมรถยนต์', description: 'ซ่อมรถทุกยี่ห้อ' });

    expect(content.updateSeo).toHaveBeenCalledWith('p2', {
      title: 'บริการซ่อมรถยนต์',
      description: 'ซ่อมรถทุกยี่ห้อ',
    });
    expect(saved.previous).toEqual({ title: '', description: '' });
  });
});

describe('createHttpAnalyticsApi', () => {
  it('asks for the chosen range', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { range: '30d' } }));
    await createHttpAnalyticsApi(config(fetchImpl)).getSummary('30d');

    expect(call(fetchImpl)[0]).toBe('http://api.test/api/v1/analytics?range=30d');
  });
});

describe('createHttpNewsletterApi', () => {
  it('reads the list and rebuilds the page from data + meta', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        data: { items: [{ id: 's1', email: 'a@b.com' }], total: 3, activeCount: 2 },
        meta: { cursor: 's1' },
      }),
    );

    const page = await createHttpNewsletterApi(config(fetchImpl)).list({ status: 'active', q: 'a' });

    const [url] = call(fetchImpl);
    expect(url).toContain('/api/v1/subscribers?');
    expect(url).toContain('status=active');
    expect(url).toContain('q=a');
    expect(page).toEqual({
      items: [{ id: 's1', email: 'a@b.com' }],
      total: 3,
      activeCount: 2,
      cursor: 's1',
    });
  });

  it('adds a subscriber with a POST', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 's2' } }));
    await createHttpNewsletterApi(config(fetchImpl)).add({ email: 'new@example.com' });

    const [url, init] = call(fetchImpl);
    expect(url).toBe('http://api.test/api/v1/subscribers');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body ?? '{}')).toEqual({ email: 'new@example.com' });
  });

  it('sends the new status with a PATCH', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 's1' } }));
    await createHttpNewsletterApi(config(fetchImpl)).setStatus('s1', 'unsubscribed');

    const [url, init] = call(fetchImpl);
    expect(url).toBe('http://api.test/api/v1/subscribers/s1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body ?? '{}')).toEqual({ status: 'unsubscribed' });
  });

  it('turns an error envelope into a human message', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: 'conflict', message: 'อีเมลนี้อยู่ในรายการแล้ว' }, 409));

    await expect(
      createHttpNewsletterApi(config(fetchImpl)).add({ email: 'a@b.com' }),
    ).rejects.toMatchObject({ code: 'conflict', message: 'อีเมลนี้อยู่ในรายการแล้ว' });
  });
});

describe('createHttpAppsApi', () => {
  it('reads the store and installs an app', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: [{ key: 'seo-booster' }] }))
      .mockResolvedValueOnce(jsonResponse({ data: { key: 'seo-booster', enabled: true } }));

    const api = createHttpAppsApi(config(fetchImpl));
    const store = await api.store();
    const installed = await api.install('seo-booster');

    expect(call(fetchImpl, 0)[0]).toBe('http://api.test/api/v1/apps');
    expect(call(fetchImpl, 1)[0]).toBe('http://api.test/api/v1/site-apps/seo-booster');
    expect(call(fetchImpl, 1)[1].method).toBe('POST');
    expect(store).toEqual([{ key: 'seo-booster' }]);
    expect(installed).toEqual({ key: 'seo-booster', enabled: true });
  });

  it('enables an app with a PATCH and uninstalls with DELETE', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ data: { key: 'seo-booster', enabled: false } }))
      .mockResolvedValueOnce(jsonResponse({ data: { success: true } }));

    const api = createHttpAppsApi(config(fetchImpl));
    await api.setEnabled('seo-booster', false);
    await api.uninstall('seo-booster');

    expect(JSON.parse(call(fetchImpl, 0)[1].body ?? '{}')).toEqual({ enabled: false });
    expect(call(fetchImpl, 1)[1].method).toBe('DELETE');
  });
});

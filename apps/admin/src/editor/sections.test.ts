import { defaultBlockStyle, type SectionTemplate } from '@lumio/shared';
import { describe, expect, it, vi } from 'vitest';
import { createDemoSectionTemplateApi, createHttpSectionTemplateApi } from './sections.js';

const blocks = [
  {
    id: 'blk_1',
    type: 'hero',
    version: 1,
    props: { heading: 'กาแฟคั่วสด' },
    style: { ...defaultBlockStyle, visibility: { ...defaultBlockStyle.visibility } },
    children: [],
  },
];

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('createHttpSectionTemplateApi', () => {
  it('lists saved sections with the site header', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => jsonResponse({ data: [] }));
    const api = createHttpSectionTemplateApi({
      baseUrl: 'http://api.test',
      getAccessToken: () => 'token-1',
      getSiteId: () => 'site-1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await api.list();

    const call = fetchImpl.mock.calls[0];
    expect(call?.[0]).toBe('http://api.test/api/v1/section-templates');
    expect(call?.[1]?.headers).toMatchObject({
      authorization: 'Bearer token-1',
      'x-site-id': 'site-1',
    });
  });

  it('posts the section name and its blocks', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({ data: { id: 'st1', name: 'ฮีโร่', blocks } }),
    );
    const api = createHttpSectionTemplateApi({
      baseUrl: 'http://api.test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const saved = await api.create({ name: 'ฮีโร่', blocks });

    expect(saved.id).toBe('st1');
    const call = fetchImpl.mock.calls[0];
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ name: 'ฮีโร่' });
  });

  it('deletes a saved section', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) => jsonResponse({ data: { success: true } }));
    const api = createHttpSectionTemplateApi({
      baseUrl: 'http://api.test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await api.remove('st1');

    const call = fetchImpl.mock.calls[0];
    expect(call?.[0]).toBe('http://api.test/api/v1/section-templates/st1');
    expect(call?.[1]?.method).toBe('DELETE');
  });
});

describe('createDemoSectionTemplateApi', () => {
  it('saves, lists and deletes sections in memory', async () => {
    const api = createDemoSectionTemplateApi();

    const saved = await api.create({ name: 'ฮีโร่ร้านกาแฟ', blocks });
    expect(await api.list()).toHaveLength(1);

    await api.remove(saved.id);
    expect(await api.list()).toEqual([]);
  });

  it('reports a section that is already gone', async () => {
    await expect(createDemoSectionTemplateApi().remove('missing')).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('keeps the newest section first', async () => {
    const api = createDemoSectionTemplateApi();
    const first: SectionTemplate = await api.create({ name: 'แรก', blocks });
    const second = await api.create({ name: 'สอง', blocks });

    expect((await api.list()).map((item) => item.id)).toEqual([second.id, first.id]);
  });
});

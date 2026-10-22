import { describe, expect, it, vi } from 'vitest';
import {
  aiProviderLabel,
  aiProposalChanges,
  createHttpAiApi,
  type HttpAiApiConfig,
} from './api.js';

const jsonResponse = (body: unknown, status = 200): Response =>
  ({ ok: status < 400, status, json: async () => body }) as unknown as Response;

const config = (fetchImpl: ReturnType<typeof vi.fn>): HttpAiApiConfig => ({
  baseUrl: 'http://api.test',
  getAccessToken: () => 'token-1',
  getSiteId: () => 'site-1',
  fetchImpl: fetchImpl as unknown as typeof fetch,
});

const call = (
  fetchImpl: ReturnType<typeof vi.fn>,
  index = 0,
): [string, { method?: string; headers: Record<string, string>; body?: string }] =>
  fetchImpl.mock.calls[index] as [
    string,
    { method?: string; headers: Record<string, string>; body?: string },
  ];

const answer = {
  proposal: {
    id: 'p1',
    action: 'rewrite',
    label: 'ทำให้สั้นลง',
    summary: 'ทำให้สั้นลง 1 ข้อความ',
    changes: [{ field: 'text', label: 'ข้อความที่เลือก', before: 'ยาว', after: 'สั้น' }],
    provider: 'local',
  },
  usage: { used: 5, limit: 200, remaining: 195 },
};

describe('createHttpAiApi', () => {
  it('asks for the plan status with the site header', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { enabled: true } }));
    const status = await createHttpAiApi(config(fetchImpl)).status();

    const [url, init] = call(fetchImpl);
    expect(url).toBe('http://api.test/api/v1/ai/status');
    expect(init.headers['x-site-id']).toBe('site-1');
    expect(init.headers.authorization).toBe('Bearer token-1');
    expect(status).toEqual({ enabled: true });
  });

  it('sends the admin UI language so labels come back translated', async () => {
    vi.stubGlobal('localStorage', { getItem: () => 'en', setItem: () => undefined });
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: { enabled: true } }));

    try {
      await createHttpAiApi(config(fetchImpl)).status();
      expect(call(fetchImpl)[1].headers['x-locale']).toBe('en');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('posts a block command with the selected fields', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: answer }));

    await createHttpAiApi(config(fetchImpl)).blockCommand({
      pageId: 'page-1',
      instruction: 'ทำให้สั้นลง',
      texts: [{ path: 'props.heading', label: 'หัวข้อหลัก', value: 'ยาว' }],
    });

    const [url, init] = call(fetchImpl);
    expect(url).toBe('http://api.test/api/v1/ai/block-command');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toMatchObject({
      pageId: 'page-1',
      texts: [{ path: 'props.heading' }],
    });
  });

  it('posts a whole-site instruction to its own route', async () => {
    const command = {
      proposal: {
        id: 'c1',
        action: 'site-command',
        label: 'สั่งงานทั้งเว็บ',
        summary: 'ปรับสีและสไตล์ให้ทุกส่วนของเว็บพร้อมกัน',
        changes: [
          { field: 'colors.primary', label: 'สีหลัก', before: '#4F46E5', after: '#EA580C' },
        ],
        patch: { colors: { primary: '#EA580C' } },
        inversePatch: { colors: { primary: '#4F46E5' } },
        provider: 'local',
      },
      usage: { used: 6, limit: 200, remaining: 194 },
    };
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: command }));

    const result = await createHttpAiApi(config(fetchImpl)).siteCommand({
      instruction: 'เปลี่ยนปุ่มทั้งหมดเป็นสีส้ม',
    });

    const [url, init] = call(fetchImpl);
    expect(url).toBe('http://api.test/api/v1/ai/site-command');
    expect(JSON.parse(init.body ?? '{}')).toEqual({
      instruction: 'เปลี่ยนปุ่มทั้งหมดเป็นสีส้ม',
    });
    expect(result.proposal.action).toBe('site-command');
  });

  it('posts the texts and the chosen style', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: answer }));
    const result = await createHttpAiApi(config(fetchImpl)).rewrite({
      texts: ['กาแฟสด อร่อยมาก'],
      style: 'shorter',
    });

    const [url, init] = call(fetchImpl);
    expect(url).toBe('http://api.test/api/v1/ai/rewrite');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body ?? '{}')).toEqual({
      texts: ['กาแฟสด อร่อยมาก'],
      style: 'shorter',
    });
    expect(result.proposal.changes[0]?.after).toBe('สั้น');
  });

  it('posts the translation, alt-text and seo payloads to their own routes', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ data: answer }));
    const api = createHttpAiApi(config(fetchImpl));

    await api.translate({ texts: ['สวัสดี'], targetLocale: 'en' });
    await api.altText({ mediaId: 'm1', context: 'โฟลเดอร์ hero' });
    await api.seo({ pageId: 'page-1', keyword: 'กาแฟดอย' });

    expect(call(fetchImpl, 0)[0]).toBe('http://api.test/api/v1/ai/translate');
    expect(JSON.parse(call(fetchImpl, 1)[1].body ?? '{}')).toEqual({
      mediaId: 'm1',
      context: 'โฟลเดอร์ hero',
    });
    expect(JSON.parse(call(fetchImpl, 2)[1].body ?? '{}')).toEqual({
      pageId: 'page-1',
      keyword: 'กาแฟดอย',
    });
  });

  it('turns a refusal into an ApiError carrying the Thai message', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ error: 'conflict', message: 'แพ็กเกจนี้ยังไม่รวมผู้ช่วย AI' }, 409),
      );

    await expect(
      createHttpAiApi(config(fetchImpl)).rewrite({ texts: ['ก'], style: 'shorter' }),
    ).rejects.toMatchObject({
      code: 'conflict',
      message: 'แพ็กเกจนี้ยังไม่รวมผู้ช่วย AI',
      status: 409,
    });
  });
});

describe('aiProviderLabel', () => {
  it('names the engine honestly', () => {
    expect(aiProviderLabel('local')).toContain('ในเครื่อง');
    expect(aiProviderLabel('demo')).toBe('โหมดทดลอง');
    expect(aiProviderLabel('openai')).toBe('ผู้ให้บริการ AI');
  });
});

describe('aiProposalChanges', () => {
  it('answers an empty list when there is no proposal', () => {
    expect(aiProposalChanges(null)).toEqual([]);
  });
});

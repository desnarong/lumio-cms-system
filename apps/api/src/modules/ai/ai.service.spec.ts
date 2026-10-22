import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_THEME_TOKENS, themeCommandFromInstruction, type AiSiteDraft } from '@lumio/shared';
import { monthStart } from './ai.service.js';
import { MemoryAiCache } from './ai.cache.js';
import { AiProviderError, LocalAiProvider, type AiProvider } from './ai.provider.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AiService } from './ai.service.js';

/** Draft the stubbed engines answer with, so `generateSite` is never undefined. */
const siteDraftStub = (): AiSiteDraft => ({
  name: 'ร้านกาแฟของฉัน',
  tagline: 'กาแฟคั่วสดจากดอย',
  businessType: 'restaurant',
  styleId: 'warm',
  primaryColor: '#8B5E3C',
  accentColor: '#C98A5B',
  pages: [
    { title: 'หน้าแรก', purpose: 'แนะนำร้าน' },
    { title: 'เมนู', purpose: 'รายการอาหาร' },
    { title: 'ติดต่อเรา', purpose: 'ช่องทางติดต่อ' },
  ],
  provider: 'stub',
});

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const USER_ID = '00000000-0000-4000-8000-0000000000b1';
const MEDIA_ID = '00000000-0000-4000-8000-0000000000c1';
const PAGE_ID = '00000000-0000-4000-8000-0000000000d1';

interface Options {
  plan?: string;
  used?: number;
  /** Description of the first image in a batch; null means "none yet". */
  alt?: string | null;
  /** Description of the second image in a batch. */
  altAll?: string | null;
  media?: boolean;
  page?: boolean;
  seo?: Record<string, unknown>;
  themeTokens?: unknown;
}

interface Harness {
  service: AiService;
  provider: AiProvider;
  usageRows: Record<string, unknown>[];
  auditRows: Record<string, unknown>[];
}

const harness = (options: Options = {}, provider?: AiProvider): Harness => {
  const usageRows: Record<string, unknown>[] = [];
  const auditRows: Record<string, unknown>[] = [];

  const tx = {
    site: {
      findUnique: vi.fn(async () => ({
        plan: options.plan ?? 'pro',
        themeTokens: options.themeTokens ?? DEFAULT_THEME_TOKENS,
      })),
    },
    aiUsage: {
      count: vi.fn(async () => options.used ?? 0),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        usageRows.push(data);
        return data;
      }),
    },
    media: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        options.media === false
          ? null
          : { filename: 'shop-front.jpg', folder: 'ร้าน', alt: options.alt ?? null, id: where.id },
      ),
      findMany: vi.fn(async () =>
        options.media === false
          ? []
          : [
              {
                id: MEDIA_ID,
                filename: 'shop-front.jpg',
                folder: 'ร้าน',
                alt: options.alt ?? null,
              },
              {
                id: 'media-2',
                filename: 'shop-inside.jpg',
                folder: 'ร้าน',
                alt: options.altAll ?? null,
              },
            ],
      ),
    },
    content: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        options.page === false
          ? null
          : {
              id: where.id,
              title: 'หน้าแรก',
              seo: options.seo ?? {},
              blocksDraft: [
                {
                  id: 'b1',
                  type: 'hero',
                  version: 1,
                  props: { heading: 'กาแฟคั่วสดจากดอย', subheading: 'คั่วใหม่ทุกสัปดาห์' },
                  style: {},
                  children: [],
                },
              ],
            },
      ),
    },
    auditLog: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        auditRows.push(data);
        return data;
      }),
    },
  };

  const db = {
    forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx)),
  } as unknown as PrismaService;

  const engine: AiProvider =
    provider ??
    ({
      name: 'stub',
      model: 'stub-1',
      supports: () => true,
      rewrite: vi.fn(async ({ texts }: { texts: string[] }) =>
        texts.map((text) => `ใหม่: ${text}`),
      ),
      translate: vi.fn(async ({ texts }: { texts: string[] }) => texts.map((text) => `EN:${text}`)),
      altText: vi.fn(async () => 'ภาพ: ร้านกาแฟหน้าร้าน'),
      seo: vi.fn(async () => ({ title: 'กาแฟดอยคั่วสด', description: 'คั่วใหม่ทุกสัปดาห์' })),
      generateSite: vi.fn(async () => siteDraftStub()),
      blockCommand: async ({ texts }: { texts: { path: string; value: string }[] }) => ({
        changes: texts.map((text) => ({ path: text.path, after: `ใหม่: ${text.value}` })),
      }),
      siteCommand: vi.fn(
        async ({
          instruction,
          tokens,
          locale,
        }: {
          instruction: string;
          tokens: unknown;
          locale: 'th' | 'en';
        }) => {
          const command = themeCommandFromInstruction(instruction, tokens, locale);
          if (!command) throw new AiProviderError('ไม่เข้าใจคำสั่ง');
          return command;
        },
      ),
    } satisfies AiProvider);

  const service = new AiService(db, engine, new MemoryAiCache());
  return { service, provider: engine, usageRows, auditRows };
};

describe('AiService.blockCommand', () => {
  const texts = [{ path: 'props.heading', label: 'หัวข้อหลัก', value: 'กาแฟคั่วสดจากดอย' }];

  it('answers with the same path so the editor can write it back', async () => {
    const { service, usageRows, auditRows } = harness();

    const result = await service.blockCommand(SITE_ID, USER_ID, {
      pageId: PAGE_ID,
      instruction: 'ทำให้สั้นลง',
      texts,
    });

    expect(result.proposal.action).toBe('block-command');
    expect(result.proposal.changes[0]).toMatchObject({
      field: 'text',
      label: 'หัวข้อหลัก',
      before: 'กาแฟคั่วสดจากดอย',
      path: 'props.heading',
    });
    expect(result.proposal.changes[0]?.after.length).toBeGreaterThan(0);
    expect(usageRows[0]).toMatchObject({ action: 'block-command' });
    expect(auditRows[0]).toMatchObject({ action: 'ai.block-command' });
  });

  it('ignores a path the block does not have', async () => {
    const { service } = harness(
      {},
      {
        name: 'stub',
        model: 'stub-1',
        supports: () => true,
        rewrite: async ({ texts: input }: { texts: string[] }) => input,
        translate: async ({ texts: input }: { texts: string[] }) => input,
        altText: async () => '',
        seo: async () => ({ title: '', description: '' }),
        generateSite: async () => siteDraftStub(),
        siteCommand: async () => {
          throw new AiProviderError('not used');
        },
        blockCommand: async () => ({ changes: [{ path: 'props.unknown', after: 'x' }] }),
      },
    );

    await expect(
      service.blockCommand(SITE_ID, USER_ID, {
        pageId: PAGE_ID,
        instruction: 'ทำให้สั้นลง',
        texts,
      }),
    ).rejects.toThrow(/ยังไม่ได้ปรับอะไรใหม่/);
  });

  it('says the engine did not understand instead of returning an empty diff', async () => {
    const { service } = harness(
      {},
      {
        name: 'stub',
        model: 'stub-1',
        supports: () => true,
        rewrite: async ({ texts: input }: { texts: string[] }) => input,
        translate: async ({ texts: input }: { texts: string[] }) => input,
        altText: async () => '',
        seo: async () => ({ title: '', description: '' }),
        generateSite: async () => siteDraftStub(),
        siteCommand: async () => {
          throw new AiProviderError('not used');
        },
        blockCommand: async () => {
          throw new AiProviderError('ผู้ช่วยยังไม่เข้าใจคำสั่งนี้');
        },
      },
    );

    await expect(
      service.blockCommand(SITE_ID, USER_ID, {
        pageId: PAGE_ID,
        instruction: 'ทำอะไรสักอย่าง',
        texts,
      }),
    ).rejects.toThrow('ผู้ช่วยยังไม่เข้าใจคำสั่งนี้');
  });
});

describe('AiService.status', () => {
  it('reports the plan, the remaining quota and the engine', async () => {
    const { service } = harness({ plan: 'pro', used: 4 });
    const status = await service.status(SITE_ID);

    expect(status.enabled).toBe(true);
    expect(status.planLabel).toBe('โปร');
    expect(status.provider).toBe('stub');
    expect(status.usage).toEqual({ used: 4, limit: 200, remaining: 196 });
  });

  it('marks plans without an AI allowance as disabled', async () => {
    const status = await harness({ plan: 'starter' }).service.status(SITE_ID);
    expect(status.enabled).toBe(false);
    expect(status.usage.limit).toBeNull();
  });
});

describe('AiService quota gate', () => {
  it('refuses a plan that does not include the assistant', async () => {
    await expect(
      harness({ plan: 'free' }).service.rewrite(SITE_ID, USER_ID, {
        texts: ['สวัสดี'],
        style: 'shorter',
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('refuses once the month is used up, and says how much was used', async () => {
    await expect(
      harness({ plan: 'pro', used: 200 }).service.rewrite(SITE_ID, USER_ID, {
        texts: ['สวัสดี'],
        style: 'shorter',
      }),
    ).rejects.toThrow(/ครบ 200 ครั้ง/);
  });

  it('refuses an action the configured engine cannot do', async () => {
    const engine: AiProvider = {
      name: 'local',
      model: 'lumio-local',
      supports: () => false,
      rewrite: async () => [],
      translate: async () => [],
      altText: async () => '',
      seo: async () => ({ title: '', description: '' }),
      generateSite: async () => siteDraftStub(),
      blockCommand: async ({ texts }: { texts: { path: string; value: string }[] }) => ({
        changes: texts.map((text) => ({ path: text.path, after: `ใหม่: ${text.value}` })),
      }),
      siteCommand: async () => {
        throw new AiProviderError('site-command is tested separately');
      },
    };
    await expect(
      harness({}, engine).service.translate(SITE_ID, USER_ID, {
        texts: ['สวัสดี'],
        targetLocale: 'en',
      }),
    ).rejects.toThrow(/AI_PROVIDER=openai/);
  });

  it('starts the quota window at the first of the month (UTC)', async () => {
    expect(monthStart(new Date('2026-10-21T09:00:00.000Z')).toISOString()).toBe(
      '2026-10-01T00:00:00.000Z',
    );
  });
});

describe('AiService.rewrite', () => {
  it('answers with a proposal and the updated usage', async () => {
    const { service, usageRows, auditRows } = harness({ plan: 'pro', used: 2 });

    const result = await service.rewrite(SITE_ID, USER_ID, {
      texts: ['กาแฟสด อร่อยมาก'],
      style: 'shorter',
    });

    expect(result.proposal.action).toBe('rewrite');
    expect(result.proposal.label).toBe('ทำให้สั้นลง');
    expect(result.proposal.summary).toBe('ทำให้สั้นลง 1 ข้อความ');
    expect(result.proposal.changes[0]).toMatchObject({
      field: 'text',
      label: 'ข้อความที่เลือก',
      before: 'กาแฟสด อร่อยมาก',
      after: 'ใหม่: กาแฟสด อร่อยมาก',
    });
    expect(result.usage).toEqual({ used: 3, limit: 200, remaining: 197 });
    expect(usageRows[0]).toMatchObject({ action: 'rewrite', provider: 'stub', items: 1 });
    expect(auditRows[0]).toMatchObject({ action: 'ai.rewrite' });
  });

  it('numbers the changes when several texts are rewritten at once', async () => {
    const result = await harness().service.rewrite(SITE_ID, USER_ID, {
      texts: ['หนึ่ง', 'สอง'],
      style: 'formal',
    });

    expect(result.proposal.changes.map((change) => change.label)).toEqual([
      'ข้อความที่ 1',
      'ข้อความที่ 2',
    ]);
    expect(result.proposal.summary).toBe('ทางการขึ้น 2 ข้อความ');
  });

  it('says so when the engine changed nothing', async () => {
    const engine: AiProvider = {
      name: 'stub',
      model: 'stub-1',
      supports: () => true,
      rewrite: async ({ texts }: { texts: string[] }) => texts,
      translate: async ({ texts }: { texts: string[] }) => texts,
      altText: async () => '',
      seo: async () => ({ title: '', description: '' }),
      generateSite: async () => siteDraftStub(),
      blockCommand: async ({ texts }: { texts: { path: string; value: string }[] }) => ({
        changes: texts.map((text) => ({ path: text.path, after: `ใหม่: ${text.value}` })),
      }),
      siteCommand: async () => {
        throw new AiProviderError('site-command is tested separately');
      },
    };

    await expect(
      harness({}, engine).service.rewrite(SITE_ID, USER_ID, {
        texts: ['สั้นอยู่แล้ว'],
        style: 'shorter',
      }),
    ).rejects.toThrow(/ยังไม่ได้ปรับอะไรใหม่/);
  });

  it('turns an engine failure into a readable Thai message', async () => {
    const engine: AiProvider = {
      name: 'stub',
      model: 'stub-1',
      supports: () => true,
      rewrite: async () => {
        throw new AiProviderError('ยังไม่ได้ตั้งค่า AI_API_KEY');
      },
      translate: async () => [],
      altText: async () => '',
      seo: async () => ({ title: '', description: '' }),
      generateSite: async () => siteDraftStub(),
      blockCommand: async ({ texts }: { texts: { path: string; value: string }[] }) => ({
        changes: texts.map((text) => ({ path: text.path, after: `ใหม่: ${text.value}` })),
      }),
      siteCommand: async () => {
        throw new AiProviderError('site-command is tested separately');
      },
    };

    await expect(
      harness({}, engine).service.rewrite(SITE_ID, USER_ID, { texts: ['ก'], style: 'shorter' }),
    ).rejects.toThrow(/AI_API_KEY/);
  });

  it('serves a repeated request from the cache without calling the engine twice', async () => {
    const { service, provider } = harness();

    await service.rewrite(SITE_ID, USER_ID, { texts: ['กาแฟ'], style: 'shorter' });
    await service.rewrite(SITE_ID, USER_ID, { texts: ['กาแฟ'], style: 'shorter' });

    expect(vi.mocked(provider.rewrite)).toHaveBeenCalledTimes(1);
  });
});

describe('AiService.translate', () => {
  it('proposes a translation per text', async () => {
    const result = await harness().service.translate(SITE_ID, USER_ID, {
      texts: ['สวัสดี', 'ยินดีต้อนรับ'],
      targetLocale: 'en',
    });

    expect(result.proposal.label).toBe('แปลเป็นอังกฤษ');
    expect(result.proposal.changes.map((change) => change.after)).toEqual([
      'EN:สวัสดี',
      'EN:ยินดีต้อนรับ',
    ]);
  });

  it('uses the local engine message when a real model is required', async () => {
    const service = new AiService(
      {
        forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) =>
          fn({
            site: { findUnique: async () => ({ plan: 'pro' }) },
            aiUsage: { count: async () => 0, create: async () => ({}) },
            auditLog: { create: async () => ({}) },
          }),
        ),
      } as unknown as PrismaService,
      new LocalAiProvider(),
      new MemoryAiCache(),
    );

    await expect(
      service.translate(SITE_ID, USER_ID, { texts: ['สวัสดี'], targetLocale: 'en' }),
    ).rejects.toThrow(/AI_PROVIDER=openai/);
  });
});

describe('AiService.altText', () => {
  it('proposes the new alt text next to the current one', async () => {
    const result = await harness({ alt: 'รูปเก่า' }).service.altText(SITE_ID, USER_ID, {
      mediaId: MEDIA_ID,
    });

    expect(result.proposal.action).toBe('alt-text');
    expect(result.proposal.changes[0]).toEqual({
      field: 'alt',
      label: 'คำอธิบายรูป',
      before: 'รูปเก่า',
      after: 'ภาพ: ร้านกาแฟหน้าร้าน',
    });
  });

  it('answers 404 for a picture of another site', async () => {
    await expect(
      harness({ media: false }).service.altText(SITE_ID, USER_ID, { mediaId: MEDIA_ID }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('AiService.altTextBatch', () => {
  it('describes every image that has no description yet', async () => {
    const { service, usageRows, auditRows } = harness({ plan: 'pro' });

    const result = await service.altTextBatch(SITE_ID, USER_ID, {
      mediaIds: [MEDIA_ID, 'media-2'],
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({
      mediaId: MEDIA_ID,
      filename: 'shop-front.jpg',
      before: '',
      after: 'ภาพ: ร้านกาแฟหน้าร้าน',
    });
    expect(result.skipped).toBe(0);
    // One usage row for the batch, counting the images it really answered.
    expect(usageRows).toHaveLength(1);
    expect(usageRows[0]).toMatchObject({ action: 'alt-text', items: 2 });
    expect(auditRows[0]).toMatchObject({ action: 'ai.alt-text' });
  });

  it('leaves an image that already has a description alone', async () => {
    const result = await harness({ alt: 'รูปหน้าร้านเดิม' }).service.altTextBatch(
      SITE_ID,
      USER_ID,
      {
        mediaIds: [MEDIA_ID, 'media-2'],
      },
    );

    expect(result.skipped).toBe(1);
    expect(result.items.map((item) => item.mediaId)).toEqual(['media-2']);
  });

  it('says so when every image already has a description', async () => {
    await expect(
      harness({ alt: 'มีแล้ว', altAll: 'มีแล้ว' }).service.altTextBatch(SITE_ID, USER_ID, {
        mediaIds: [MEDIA_ID, 'media-2'],
      }),
    ).rejects.toThrow(/มีคำอธิบายครบแล้ว/);
  });

  it('refuses a batch larger than the remaining quota', async () => {
    await expect(
      harness({ plan: 'pro', used: 199 }).service.altTextBatch(SITE_ID, USER_ID, {
        mediaIds: [MEDIA_ID, 'media-2'],
      }),
    ).rejects.toThrow(/เหลือ 1 ครั้ง/);
  });

  it('answers 404 when none of the ids belong to this site', async () => {
    await expect(
      harness({ media: false }).service.altTextBatch(SITE_ID, USER_ID, { mediaIds: [MEDIA_ID] }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('AiService.generateSite', () => {
  it('answers with the engine draft and records one usage', async () => {
    const { service, usageRows, auditRows } = harness({ plan: 'pro' });

    const draft = await service.generateSite(SITE_ID, USER_ID, {
      prompt: 'ร้านกาแฟเล็ก ๆ ในเชียงใหม่',
      locale: 'th',
    });

    expect(draft.businessType).toBe('restaurant');
    expect(draft.pages).toHaveLength(3);
    expect(draft.provider).toBe('stub');
    expect(usageRows[0]).toMatchObject({ action: 'generate-site', items: 3 });
    expect(auditRows[0]).toMatchObject({ action: 'ai.generate-site' });
  });

  it('needs a plan that includes the assistant', async () => {
    await expect(
      harness({ plan: 'free' }).service.generateSite(SITE_ID, USER_ID, {
        prompt: 'ร้านกาแฟ',
        locale: 'th',
      }),
    ).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('reports an engine that cannot draft a site', async () => {
    const engine: AiProvider = {
      name: 'local',
      model: 'lumio-local',
      supports: () => false,
      rewrite: async () => [],
      translate: async () => [],
      altText: async () => '',
      seo: async () => ({ title: '', description: '' }),
      generateSite: async () => siteDraftStub(),
      blockCommand: async ({ texts }: { texts: { path: string; value: string }[] }) => ({
        changes: texts.map((text) => ({ path: text.path, after: `ใหม่: ${text.value}` })),
      }),
      siteCommand: async () => {
        throw new AiProviderError('site-command is tested separately');
      },
    };

    await expect(
      harness({}, engine).service.generateSite(SITE_ID, USER_ID, {
        prompt: 'ร้านกาแฟ',
        locale: 'th',
      }),
    ).rejects.toThrow(/AI_PROVIDER=openai/);
  });
});

describe('AiService.seo', () => {
  it('drafts meta tags from the page content, keeping the current values as context', async () => {
    const result = await harness({
      seo: { title: 'ชื่อเดิม', description: 'คำอธิบายเดิม' },
    }).service.seo(SITE_ID, USER_ID, { pageId: PAGE_ID, keyword: 'กาแฟดอย' });

    expect(result.proposal.action).toBe('seo');
    expect(result.proposal.changes).toEqual([
      {
        field: 'title',
        label: 'ชื่อเรื่องสำหรับค้นหา',
        before: 'ชื่อเดิม',
        after: 'กาแฟดอยคั่วสด',
      },
      {
        field: 'description',
        label: 'คำอธิบายหน้า',
        before: 'คำอธิบายเดิม',
        after: 'คั่วใหม่ทุกสัปดาห์',
      },
    ]);
  });

  it('passes the page headings to the engine and answers 404 for an unknown page', async () => {
    const { service, provider } = harness();

    await service.seo(SITE_ID, USER_ID, { pageId: PAGE_ID });
    expect(vi.mocked(provider.seo)).toHaveBeenCalledWith(
      expect.objectContaining({
        headings: ['กาแฟคั่วสดจากดอย'],
        body: ['คั่วใหม่ทุกสัปดาห์'],
      }),
    );

    await expect(
      harness({ page: false }).service.seo(SITE_ID, USER_ID, { pageId: PAGE_ID }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('AiService.translateTexts', () => {
  it('translates in batches of five and records one usage row per batch', async () => {
    const { service, usageRows, provider } = harness();
    const texts = Array.from({ length: 7 }, (_, index) => `ข้อความ ${index}`);

    const result = await service.translateTexts(SITE_ID, USER_ID, texts, 'en');

    expect(result).toEqual(texts.map((text) => `EN:${text}`));
    expect(provider.translate).toHaveBeenCalledTimes(2);
    expect(usageRows).toHaveLength(2);
    expect(usageRows.map((row) => row.items)).toEqual([5, 2]);
  });

  it('does nothing for an empty list', async () => {
    const { service, provider } = harness();
    expect(await service.translateTexts(SITE_ID, USER_ID, [], 'en')).toEqual([]);
    expect(provider.translate).not.toHaveBeenCalled();
  });

  it('refuses when the plan does not include the assistant', async () => {
    const { service } = harness({ plan: 'free' });
    await expect(service.translateTexts(SITE_ID, USER_ID, ['สวัสดี'], 'en')).rejects.toMatchObject({
      code: 'forbidden',
    });
  });

  it('refuses when the engine cannot translate', async () => {
    const { service } = harness({}, new LocalAiProvider());
    await expect(service.translateTexts(SITE_ID, USER_ID, ['สวัสดี'], 'en')).rejects.toMatchObject({
      code: 'conflict',
    });
  });
});

describe('AiService.siteCommand', () => {
  it('turns one sentence into a token diff and counts one credit', async () => {
    const { service, usageRows, auditRows } = harness({ used: 3 });
    const result = await service.siteCommand(
      SITE_ID,
      USER_ID,
      { instruction: 'เปลี่ยนปุ่มทั้งหมดเป็นสีส้ม' },
      'en',
    );

    expect(result.proposal.action).toBe('site-command');
    expect(result.proposal.label).toBe('Whole-site command');
    expect(result.proposal.changes[0]?.label).toBe('Main color (buttons and links)');
    expect(result.proposal.patch.colors?.primary).toMatch(/^#[0-9A-F]{6}$/);
    expect(result.proposal.inversePatch.colors?.primary).toBe(DEFAULT_THEME_TOKENS.colors.primary);
    expect(result.usage.used).toBe(4);
    expect(usageRows[0]?.action).toBe('site-command');
    expect(auditRows[0]?.action).toBe('ai.site-command');
  });

  it('refuses an instruction it cannot read, without spending a credit', async () => {
    const { service, usageRows } = harness();
    await expect(
      service.siteCommand(SITE_ID, USER_ID, { instruction: 'สวัสดีตอนเช้า' }),
    ).rejects.toMatchObject({ code: 'conflict' });
    expect(usageRows).toHaveLength(0);
  });
});

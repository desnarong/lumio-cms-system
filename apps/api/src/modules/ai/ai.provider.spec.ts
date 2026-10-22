import { describe, expect, it, vi } from 'vitest';
import {
  AiProviderError,
  LocalAiProvider,
  OpenAiCompatibleProvider,
  altTextFrom,
  clearText,
  createAiProvider,
  expandText,
  formalizeText,
  friendlyText,
  seoFrom,
  shortenText,
  wordsFromFilename,
  type AiProvider,
} from './ai.provider.js';

const reply = (content: string, ok = true): Response =>
  ({
    ok,
    json: async () => ({ choices: [{ message: { content } }] }),
  }) as unknown as Response;

const openAi = (fetchImpl: typeof fetch): OpenAiCompatibleProvider =>
  new OpenAiCompatibleProvider({
    baseUrl: 'https://ai.example/v1',
    apiKey: 'test-key',
    model: 'test-model',
    timeoutMs: 5_000,
    fetchImpl,
  });

describe('text tools', () => {
  it('shortens text and keeps short text readable', () => {
    const long = 'กาแฟคั่วสดจากดอย ส่งตรงถึงบ้านคุณทุกสัปดาห์ พร้อมคำแนะนำการชง';
    expect(shortenText(long).length).toBeLessThan(long.length);
    expect(shortenText('สั้นอยู่แล้ว')).toBe('สั้นอยู่แล้ว');
  });

  it('formalises copy by dropping emoji and exclamation marks', () => {
    expect(formalizeText('อร่อยมาก!! ☕ มาเลย   นะ')).toBe('อร่อยมาก มาเลย นะ');
  });

  it('adds a friendly or supportive closing line', () => {
    expect(friendlyText('กาแฟคั่วสด')).toContain('ทักมาคุยกันได้เลยนะคะ');
    expect(friendlyText('กาแฟคั่วสด', 'ร้านกาแฟ')).toContain('สนใจร้านกาแฟ');
    expect(expandText('กาแฟคั่วสด')).toContain('ตั้งใจทำทุกขั้นตอน');
    expect(expandText('กาแฟคั่วสด', 'เมล็ดกาแฟ')).toContain('เราดูแลเมล็ดกาแฟ');
  });

  it('re-flows a long paragraph into shorter sentences', () => {
    const long = `${'ก'.repeat(60)} ${'ข'.repeat(60)}`;
    const result = clearText(long);
    expect(result.startsWith('ก')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(long.length);
  });

  it('builds alt text from the filename and context', () => {
    expect(wordsFromFilename('coffee-beans-01.jpg')).toEqual(['coffee', 'beans']);
    expect(wordsFromFilename('IMG_2024_final.png')).toEqual([]);
    expect(altTextFrom({ filename: 'coffee-beans-01.jpg' })).toBe('ภาพ: coffee beans');
    expect(altTextFrom({ filename: 'IMG_2024_final.png', folder: 'เมนู' })).toBe('ภาพ: เมนู');
    expect(altTextFrom({ filename: 'dsc1.jpg', context: 'ร้านกาแฟ' })).toBe('ภาพ: ภาพประกอบ (ร้านกาแฟ)');
  });

  it('drafts a title and description from the page itself', () => {
    const result = seoFrom({
      title: 'หน้าแรก',
      headings: ['กาแฟคั่วสดจากดอย'],
      body: ['เลือกเมล็ดจากสวนทางภาคเหนือ คั่วใหม่ทุกสัปดาห์'],
      keyword: 'กาแฟดอย',
    });
    expect(result.title).toBe('กาแฟคั่วสดจากดอย กาแฟดอย');
    expect(result.description).toContain('เลือกเมล็ดจากสวนทางภาคเหนือ');

    const fallback = seoFrom({ title: 'หน้าแรกของร้าน', headings: [], body: [] });
    expect(fallback.title).toBe('หน้าแรกของร้าน');
    expect(fallback.description).toBe('หน้าแรกของร้าน');
  });
});

describe('LocalAiProvider', () => {
  it('rewrites with every style and never needs a key', async () => {
    const provider = new LocalAiProvider();
    for (const style of ['shorter', 'formal', 'friendly', 'expanded', 'clearer'] as const) {
      const [result] = await provider.rewrite({ texts: ['อร่อยมาก!! ☕'], style });
      expect(result).toBeTruthy();
    }
  });

  it('refuses to translate instead of inventing text', async () => {
    await expect(
      new LocalAiProvider().translate({ texts: ['สวัสดี'], targetLocale: 'en' }),
    ).rejects.toBeInstanceOf(AiProviderError);
  });

  it('answers alt text and SEO, and reports what it cannot do', async () => {
    const provider = new LocalAiProvider();
    expect(provider.supports('rewrite')).toBe(true);
    expect(provider.supports('translate')).toBe(false);
    expect(await provider.altText({ filename: 'shop-front.jpg' })).toBe('ภาพ: shop front');
    expect(
      (await provider.seo({ title: 'ร้านกาแฟ', headings: ['คั่วสดทุกสัปดาห์'], body: [] })).title,
    ).toBe('คั่วสดทุกสัปดาห์');
  });
});

describe('OpenAiCompatibleProvider', () => {
  it('sends the prompt to the configured endpoint and parses the JSON reply', async () => {
    const fetchImpl = vi.fn(async () => reply('{"texts":["กาแฟคั่วสด"]}'));
    const provider = openAi(fetchImpl as unknown as typeof fetch);

    const [result] = await provider.rewrite({ texts: ['กาแฟสด อร่อย'], style: 'shorter' });

    expect(result).toBe('กาแฟคั่วสด');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://ai.example/v1/chat/completions');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer test-key');
    expect(init.body as string).toContain('test-model');
  });

  it('strips code fences around the JSON', async () => {
    const provider = openAi((async () =>
      reply('```json\n{"alt":"ภาพ: ร้านกาแฟ"}\n```')) as unknown as typeof fetch);
    expect(await provider.altText({ filename: 'shop.jpg' })).toBe('ภาพ: ร้านกาแฟ');
  });

  it('translates a batch and keeps the original order', async () => {
    const provider = openAi((async () =>
      reply('{"texts":["Hello","Welcome"]}')) as unknown as typeof fetch);
    expect(await provider.translate({ texts: ['สวัสดี', 'ยินดีต้อนรับ'], targetLocale: 'en' })).toEqual(
      ['Hello', 'Welcome'],
    );
  });

  it('drafts meta tags through the engine', async () => {
    const provider = openAi((async () =>
      reply('{"title":"กาแฟดอย","description":"คั่วสดทุกสัปดาห์"}')) as unknown as typeof fetch);
    expect(await provider.seo({ title: 'หน้าแรก', headings: [], body: [] })).toEqual({
      title: 'กาแฟดอย',
      description: 'คั่วสดทุกสัปดาห์',
    });
  });

  it('reports a clear reason when the key, the service or the reply is bad', async () => {
    const noKey = new OpenAiCompatibleProvider({
      baseUrl: 'https://ai.example/v1',
      apiKey: '',
      model: 'm',
      timeoutMs: 5_000,
      fetchImpl: (async () => reply('{}')) as unknown as typeof fetch,
    });
    await expect(noKey.altText({ filename: 'a.jpg' })).rejects.toThrow(/AI_API_KEY/);

    const broken = openAi((async () => reply('nope', false)) as unknown as typeof fetch);
    await expect(broken.altText({ filename: 'a.jpg' })).rejects.toThrow(/ปฏิเสธคำขอ/);

    const offline = openAi((async () => {
      throw new Error('boom');
    }) as unknown as typeof fetch);
    await expect(offline.altText({ filename: 'a.jpg' })).rejects.toThrow(/ติดต่อผู้ให้บริการ/);

    const wrongCount = openAi((async () =>
      reply('{"texts":["one"]}')) as unknown as typeof fetch);
    await expect(
      wrongCount.rewrite({ texts: ['ก', 'ข'], style: 'shorter' }),
    ).rejects.toThrow(/จำนวนข้อความ/);

    const notJson = openAi((async () => reply('{"texts":"nope"}')) as unknown as typeof fetch);
    await expect(notJson.rewrite({ texts: ['ก'], style: 'shorter' })).rejects.toThrow(
      /จำนวนข้อความ/,
    );
  });
});

describe('blockCommand', () => {
  const texts = [
    { path: 'props.heading', label: 'หัวข้อหลัก', value:
        'กาแฟคั่วสดจากดอยทุกสัปดาห์! ส่งตรงถึงบ้านคุณพร้อมคำแนะนำการชงที่บ้าน' },
    { path: 'props.subheading', label: 'คำอธิบาย', value: 'ส่งตรงถึงบ้านคุณ' },
  ];

  it('understands the everyday asks on the selected block', async () => {
    const provider = new LocalAiProvider();

    const shorter = await provider.blockCommand({
      instruction: 'ทำให้สั้นลง',
      texts,
      locale: 'th',
    });
    expect(shorter.changes[0]?.path).toBe('props.heading');
    expect(shorter.changes[0]?.after.length).toBeLessThanOrEqual(
      texts[0]?.value.length ?? 0,
    );

    const formal = await provider.blockCommand({
      instruction: 'ทำให้เป็นทางการขึ้น',
      texts,
      locale: 'th',
    });
    expect(formal.changes[0]?.after).not.toContain('!');

    const quoted = await provider.blockCommand({
      instruction: 'เปลี่ยนเป็น “คั่วใหม่ทุกวัน”',
      texts,
      locale: 'th',
    });
    expect(quoted.changes[0]?.after).toBe('คั่วใหม่ทุกวัน');
  });

  it('answers with a readable refusal when it cannot parse the command', async () => {
    const provider = new LocalAiProvider();

    await expect(
      provider.blockCommand({ instruction: 'ช่วยอะไรสักอย่าง', texts, locale: 'th' }),
    ).rejects.toBeInstanceOf(AiProviderError);
  });

  it('lets the model answer first and falls back to the parser', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      reply(
        JSON.stringify({
          changes: [
            { path: 'props.heading', after: 'คั่วใหม่ทุกวัน' },
            { path: 'props.missing', after: 'ignored' },
          ],
        }),
      ),
    );
    const answer = await openAi(fetchImpl as unknown as typeof fetch).blockCommand({
      instruction: 'เปลี่ยนหัวข้อ',
      texts,
      locale: 'th',
    });

    expect(answer.changes).toEqual([{ path: 'props.heading', after: 'คั่วใหม่ทุกวัน' }]);
  });
});

describe('createAiProvider', () => {
  const withEnv = (env: Record<string, string>): AiProvider => {
    const saved = new Map<string, string | undefined>();
    for (const [key, value] of Object.entries(env)) {
      saved.set(key, process.env[key]);
      if (value.length === 0) delete process.env[key];
      else process.env[key] = value;
    }
    try {
      return createAiProvider();
    } finally {
      for (const [key, value] of saved) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  };

  it('defaults to the key-free local engine', () => {
    expect(withEnv({ AI_PROVIDER: '' }).name).toBe('local');
  });

  it('picks the OpenAI-compatible engine when asked', () => {
    expect(withEnv({ AI_PROVIDER: 'openai' }).name).toBe('openai');
  });
});
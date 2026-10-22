import { describe, expect, it } from 'vitest';
import { createDemoContentApi, DEMO_CONTENT_ID } from './demo.js';

describe('demo content api languages', () => {
  it('reports every offered language and marks the missing ones', async () => {
    const api = createDemoContentApi();

    const translations = await api.translations(DEMO_CONTENT_ID);

    expect(translations.defaultLocale).toBe('th');
    expect(translations.items.map((item) => item.locale)).toEqual(['th', 'en']);
    expect(translations.items[0]).toMatchObject({ exists: true, slug: 'home' });
    expect(translations.items[1]).toMatchObject({ exists: false, contentId: null });
  });

  it('creates a translation as a draft with fresh block ids', async () => {
    const api = createDemoContentApi();
    const source = await api.getContent(DEMO_CONTENT_ID);

    const created = await api.createTranslation(DEMO_CONTENT_ID, {
      locale: 'en',
      translate: false,
    });

    expect(created.locale).toBe('en');
    expect(created.status).toBe('draft');
    expect(created.translationGroupId).toBe(source.translationGroupId);
    expect(created.blocks.map((block) => block.id)).not.toEqual(
      source.blocks.map((block) => block.id),
    );

    const after = await api.translations(DEMO_CONTENT_ID);
    expect(after.items.find((item) => item.locale === 'en')?.exists).toBe(true);
  });

  it('refuses translating a page into the language it is already in', async () => {
    const api = createDemoContentApi();

    await expect(
      api.createTranslation(DEMO_CONTENT_ID, { locale: 'th', translate: false }),
    ).rejects.toMatchObject({ code: 'conflict' });
  });
});

describe('demo content api translateContent', () => {
  it('tags every text and reports how many it translated', async () => {
    const api = createDemoContentApi();

    const result = await api.translateContent(DEMO_CONTENT_ID, { onlyMissing: true });

    expect(result.totalCount).toBeGreaterThan(0);
    expect(result.translatedCount).toBe(result.totalCount);
    expect(JSON.stringify(result.blocks)).toContain('(en) ');
  });

  it('leaves already-tagged text alone when only missing text is requested', async () => {
    const api = createDemoContentApi();
    const first = await api.translateContent(DEMO_CONTENT_ID, { onlyMissing: true });
    const current = await api.getContent(DEMO_CONTENT_ID);
    await api.saveBlocks(DEMO_CONTENT_ID, { blocks: first.blocks, baseRevision: current.revision });

    const second = await api.translateContent(DEMO_CONTENT_ID, { onlyMissing: true });

    expect(second.translatedCount).toBe(0);
    expect(JSON.stringify(second.blocks)).toBe(JSON.stringify(first.blocks));
  });

  it('filters the list by language', async () => {
    const api = createDemoContentApi();
    await api.createTranslation(DEMO_CONTENT_ID, { locale: 'en', translate: false });

    const english = await api.list({ type: 'page', locale: 'en' });

    expect(english.items).toHaveLength(1);
    expect(english.items.every((item) => item.locale === 'en')).toBe(true);
  });
});
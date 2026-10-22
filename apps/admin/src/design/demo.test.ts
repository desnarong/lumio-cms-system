import { describe, expect, it } from 'vitest';
import { createDemoDesignApi } from './demo.js';

describe('createDemoDesignApi', () => {
  it('starts from the first template and keeps its style', async () => {
    const design = await createDemoDesignApi().getTokens();
    expect(design.templateId).not.toBeNull();
    expect(design.tokens.colors.primary).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('applies a colour patch without losing the rest of the tokens', async () => {
    const api = createDemoDesignApi();
    const before = await api.getTokens();

    const after = await api.updateTokens({ colors: { primary: '#123456' } });

    expect(after.tokens.colors.primary).toBe('#123456');
    expect(after.tokens.fonts.heading).toBe(before.tokens.fonts.heading);
  });

  it('puts the template colours back on reset', async () => {
    const api = createDemoDesignApi();
    const original = (await api.getTokens()).tokens.colors.primary;

    await api.updateTokens({ colors: { primary: '#000000' } });
    const reset = await api.resetTokens();

    expect(reset.tokens.colors.primary).toBe(original);
  });

  it('switches template and optionally brings header/footer along', async () => {
    const api = createDemoDesignApi();
    const templates = await api.listTemplates();
    const target = templates[1]!;

    const result = await api.applyTemplate(target.id, { applyHeaderFooter: false });

    expect(result.templateId).toBe(target.id);
    expect(result.headerFooterApplied).toBe(false);
    expect(result.tokens.colors.primary).toBe(target.tokens.colors.primary);
  });

  it('saves, renames and removes a menu', async () => {
    const api = createDemoDesignApi();
    const items = [{ label: 'หน้าแรก', href: '/', children: [] }];

    await api.updateMenu('footer', { items });
    expect((await api.getMenu('footer')).items).toHaveLength(1);
  });

  it('adds, renames and removes saved sections', async () => {
    const api = createDemoDesignApi();

    const created = await api.createSection({ name: 'ฮีโร่', blocks: [] });
    expect((await api.listSections())).toHaveLength(1);

    const renamed = await api.renameSection(created.id, { name: 'ฮีโร่ใหม่' });
    expect(renamed.name).toBe('ฮีโร่ใหม่');

    await api.removeSection(created.id);
    expect(await api.listSections()).toEqual([]);
  });

  it('reports a missing section instead of failing silently', async () => {
    await expect(
      createDemoDesignApi().renameSection('missing', { name: 'x' }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it('replaces header blocks one kind at a time', async () => {
    const api = createDemoDesignApi();
    const before = await api.getGlobalBlocks();

    const after = await api.updateGlobalBlock('header', []);

    expect(after.header).toEqual([]);
    expect(after.footer).toEqual(before.footer);
  });
});

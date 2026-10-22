import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  TemplateLoadError,
  loadTemplatePacks,
  packForBusinessType,
  resolveTemplatesDirectory,
  toTemplateSummary,
} from './template-store';

const block = (id: string, type: string) => ({
  id,
  type,
  version: 1,
  props: {},
  style: {},
  children: [],
});

const hasThai = (text: string): boolean =>
  [...text].some((char) => {
    const code = char.charCodeAt(0);
    return code >= 0x0e00 && code <= 0x0e7f;
  });

const writePack = (
  root: string,
  key: string,
  overrides: { pages?: number; preview?: boolean } = {},
): void => {
  const dir = join(root, key);
  mkdirSync(join(dir, 'pages'), { recursive: true });
  writeFileSync(
    join(dir, 'manifest.json'),
    JSON.stringify({
      id: '6f12c9a0-1b34-4c5d-8e6f-7a8b9c0d1e2f',
      name: 'เทมเพลตทดสอบ',
      businessType: 'clinic',
      description: 'ใช้ในเทสต์เท่านั้น',
      styleId: 'minimal',
    }),
  );
  writeFileSync(
    join(dir, 'tokens.json'),
    JSON.stringify({
      colors: { primary: '#0E7490', accent: '#22D3EE', neutral: 'slate' },
      fonts: { heading: 'Inter', body: 'Noto Sans Thai' },
      radius: 'sm',
      button: 'outline',
      density: 'spacious',
      colorMode: 'light',
      animation: 'none',
    }),
  );
  writeFileSync(
    join(dir, 'global-blocks.json'),
    JSON.stringify({ header: [block('blk_h', 'button')], footer: [block('blk_f', 'paragraph')] }),
  );
  writeFileSync(
    join(dir, 'menus.json'),
    JSON.stringify({ header: [{ label: 'หน้าแรก', href: '/' }], footer: [] }),
  );
  writeFileSync(join(dir, 'section-styles.json'), JSON.stringify({ hero: { paddingY: 'xl' } }));

  const count = overrides.pages ?? 4;
  for (let index = 0; index < count; index += 1) {
    writeFileSync(
      join(dir, 'pages', `page-${index}.json`),
      JSON.stringify({
        title: `หน้า ${index}`,
        slug: `page-${index}`,
        blocks: [block('blk_p', 'hero')],
      }),
    );
  }
  if (overrides.preview !== false) writeFileSync(join(dir, 'preview.png'), 'png');
  writeFileSync(join(root, 'index.json'), JSON.stringify({ templates: [key] }));
};

describe('template packs on disk', () => {
  it('finds the repository templates folder', () => {
    expect(resolveTemplatesDirectory().endsWith('templates')).toBe(true);
  });

  it('uses TEMPLATES_DIR when it is configured', () => {
    const root = mkdtempSync(join(tmpdir(), 'lumio-templates-'));
    writePack(root, 'custom');

    expect(resolveTemplatesDirectory(root)).toBe(root);
  });

  it('loads every shipped pack with its tokens, pages and preview', () => {
    const packs = loadTemplatePacks(resolveTemplatesDirectory());

    expect(packs.length).toBeGreaterThanOrEqual(3);
    for (const pack of packs) {
      expect(pack.pages.length).toBeGreaterThanOrEqual(4);
      const primary = pack.tokens.colors.primary;
      expect(primary.startsWith('#')).toBe(true);
      expect(primary).toHaveLength(7);
      expect(pack.globalBlocks.header.length).toBeGreaterThan(0);
      expect(pack.previewPath.endsWith('preview.png')).toBe(true);
    }
  });

  it('has real Thai sample content, never placeholder text', () => {
    const packs = loadTemplatePacks(resolveTemplatesDirectory());
    const serialized = JSON.stringify(packs.map((pack) => pack.pages)).toLowerCase();

    expect(serialized).not.toContain('lorem');
    expect(serialized).not.toContain('placeholder');
    for (const pack of packs) {
      for (const page of pack.pages) {
        expect(hasThai(page.title)).toBe(true);
      }
    }
  });

  it('summarises a pack for the admin without leaking file paths', () => {
    const [pack] = loadTemplatePacks(resolveTemplatesDirectory());
    const summary = toTemplateSummary(pack!);

    expect(summary.previewUrl.startsWith('/templates/')).toBe(true);
    expect(summary.previewUrl.endsWith('/preview.png')).toBe(true);
    expect(JSON.stringify(summary)).not.toContain(pack!.previewPath);
    expect(summary.pages.length).toBe(pack!.pages.length);
  });

  it('picks the template that matches the business type', () => {
    const packs = loadTemplatePacks(resolveTemplatesDirectory());

    expect(packForBusinessType(packs, 'clinic').manifest.businessType).toBe('clinic');
    // Every known type has a pack of its own once the catalogue is complete.
    expect(packForBusinessType(packs, 'other').manifest.businessType).toBe('other');
    // Unknown types fall back to the first pack instead of failing the wizard.
    expect(packForBusinessType(packs, 'spaceship' as never).key).toBe(packs[0]?.key);
  });
});

describe('template pack validation', () => {
  it('refuses a pack with fewer than four sample pages', () => {
    const root = mkdtempSync(join(tmpdir(), 'lumio-templates-'));
    writePack(root, 'tiny', { pages: 2 });

    expect(() => loadTemplatePacks(root)).toThrow(TemplateLoadError);
    expect(() => loadTemplatePacks(root)).toThrow('อย่างน้อย 4 หน้า');
  });

  it('refuses a pack without a preview image', () => {
    const root = mkdtempSync(join(tmpdir(), 'lumio-templates-'));
    writePack(root, 'no-preview', { preview: false });

    expect(() => loadTemplatePacks(root)).toThrow('ไม่พบภาพตัวอย่าง');
  });

  it('explains which file is invalid', () => {
    const root = mkdtempSync(join(tmpdir(), 'lumio-templates-'));
    writePack(root, 'broken');
    writeFileSync(join(root, 'broken', 'tokens.json'), JSON.stringify({ colors: {} }));

    expect(() => loadTemplatePacks(root)).toThrow('tokens.json ไม่ถูกต้อง');
  });

  it('reports a missing templates folder instead of crashing', () => {
    const before = process.cwd();
    const empty = mkdtempSync(join(tmpdir(), 'lumio-empty-'));
    try {
      process.chdir(empty);
      expect(() => resolveTemplatesDirectory(undefined)).toThrow('ไม่พบโฟลเดอร์ templates');
    } finally {
      process.chdir(before);
    }
  });
});

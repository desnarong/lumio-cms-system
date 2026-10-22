import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  normalizeThemeTokens,
  sectionStylesSchema,
  templateGlobalBlocksSchema,
  templateIndexSchema,
  templateManifestSchema,
  templateMenusSchema,
  templatePageSchema,
  templateTokensSchema,
  type BusinessType,
  type SectionStyles,
  type TemplateGlobalBlocks,
  type TemplateManifest,
  type TemplateMenus,
  type TemplatePage,
  type TemplateSummary,
} from '@lumio/shared';
import type { ThemeTokens } from '@lumio/shared';
import type { ZodType, ZodTypeDef } from 'zod';

/**
 * Reads template packs from `templates/` (docs/design/08-theme-design-panel.md
 * 8.2). A pack is data only: tokens, header/footer, section styles, sample pages
 * and a preview image. Nothing here touches a site's content.
 */

export class TemplateLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateLoadError';
  }
}

export interface TemplatePack {
  /** Folder name, used in URLs and in `sites.template_id` lookups. */
  key: string;
  manifest: TemplateManifest;
  tokens: ThemeTokens;
  globalBlocks: TemplateGlobalBlocks;
  menus: TemplateMenus;
  sectionStyles: SectionStyles;
  pages: TemplatePage[];
  /** Absolute path of `preview.png`. */
  previewPath: string;
}

/** Where the packs live: `TEMPLATES_DIR` first, then the usual repo layouts. */
export const resolveTemplatesDirectory = (
  configured = process.env.TEMPLATES_DIR,
): string => {
  const candidates = [
    configured,
    // Running from the repo root (production image copies `templates/` there).
    join(process.cwd(), 'templates'),
    // Running from `apps/api` (`pnpm --filter api dev` and the test runner).
    join(process.cwd(), '..', '..', 'templates'),
  ].filter((candidate): candidate is string => typeof candidate === 'string' && candidate.length > 0);

  const found = candidates.find((candidate) => existsSync(join(candidate, 'index.json')));
  if (!found) {
    throw new TemplateLoadError(
      `ไม่พบโฟลเดอร์ templates (ลองแล้ว: ${candidates.join(', ')}) — ตั้งค่า TEMPLATES_DIR ได้`,
    );
  }
  return found;
};

const readJson = (path: string): unknown => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new TemplateLoadError(
      `อ่านไฟล์ ${path} ไม่ได้: ${error instanceof Error ? error.message : 'JSON ไม่ถูกต้อง'}`,
    );
  }
};

const readValidated = <T>(path: string, schema: ZodType<T, ZodTypeDef, unknown>): T => {
  const parsed = schema.safeParse(readJson(path));
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new TemplateLoadError(`ไฟล์ ${path} ไม่ถูกต้อง: ${issues}`);
  }
  return parsed.data;
};

const listPages = (dir: string): TemplatePage[] => {
  const pagesDir = join(dir, 'pages');
  if (!existsSync(pagesDir)) throw new TemplateLoadError(`ไม่พบโฟลเดอร์ ${pagesDir}`);

  return readdirSync(pagesDir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => readValidated(join(pagesDir, file), templatePageSchema));
};

export const loadTemplatePacks = (dir = resolveTemplatesDirectory()): TemplatePack[] => {
  const index = readValidated(join(dir, 'index.json'), templateIndexSchema);

  return index.templates.map((key) => {
    const packDir = join(dir, key);
    if (!existsSync(packDir)) throw new TemplateLoadError(`ไม่พบโฟลเดอร์เทมเพลต ${packDir}`);

    const manifest = readValidated(join(packDir, 'manifest.json'), templateManifestSchema);
    const tokens = readValidated(join(packDir, 'tokens.json'), templateTokensSchema);
    const pages = listPages(packDir);
    if (pages.length < 4) {
      throw new TemplateLoadError(
        `เทมเพลต ${key} ต้องมีหน้าตัวอย่างอย่างน้อย 4 หน้า (พบ ${pages.length})`,
      );
    }

    const previewPath = join(packDir, manifest.preview);
    if (!existsSync(previewPath)) {
      throw new TemplateLoadError(`ไม่พบภาพตัวอย่างของเทมเพลต ${key}: ${previewPath}`);
    }

    return {
      key,
      manifest,
      tokens: normalizeThemeTokens(tokens),
      globalBlocks: readValidated(join(packDir, 'global-blocks.json'), templateGlobalBlocksSchema),
      menus: readValidated(join(packDir, 'menus.json'), templateMenusSchema),
      sectionStyles: readValidated(join(packDir, 'section-styles.json'), sectionStylesSchema),
      pages,
      previewPath,
    };
  });
};

export const toTemplateSummary = (pack: TemplatePack): TemplateSummary => ({
  id: pack.manifest.id,
  name: pack.manifest.name,
  businessType: pack.manifest.businessType,
  description: pack.manifest.description,
  styleId: pack.manifest.styleId,
  previewUrl: `/templates/${pack.key}/${pack.manifest.preview}`,
  tokens: pack.tokens,
  pages: pack.pages.map((page) => ({ slug: page.slug, title: page.title, type: page.type })),
});

/** Template a business type starts from; unknown types get the first pack. */
export const packForBusinessType = (
  packs: readonly TemplatePack[],
  businessType: BusinessType,
): TemplatePack => {
  const match = packs.find((pack) => pack.manifest.businessType === businessType);
  const fallback = packs[0];
  if (!fallback) throw new TemplateLoadError('ยังไม่มีเทมเพลตในระบบ');
  return match ?? fallback;
};
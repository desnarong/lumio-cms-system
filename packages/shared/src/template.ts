import { z } from 'zod';
import { blockStyleSchema, blockTreeSchema, type BlockStyle, type BlockTree } from './blocks.js';
import { CONTENT_TYPES } from './content.js';
import { menuItemsSchema } from './public.js';
import { localeSchema } from './locale.js';
import { createSiteInputSchema } from './site.js';
import {
  THEME_ANIMATIONS,
  THEME_BUTTON_STYLES,
  THEME_COLOR_MODES,
  THEME_DENSITIES,
  THEME_RADIUS_SCALES,
  hexColorSchema,
  themeStylePresetSchema,
  type ThemeTokens,
} from './theme.js';

/**
 * Templates are packs of presentation, not content: tokens, header/footer,
 * section styles and sample pages (docs/design/08-theme-design-panel.md 8.2).
 * Switching template must never touch `contents.blocks_*`.
 */

export const BUSINESS_TYPES = [
  'restaurant',
  'clinic',
  'freelance',
  'shop',
  'blog',
  'other',
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  restaurant: 'ร้านอาหาร / คาเฟ่',
  clinic: 'คลินิก / สุขภาพ',
  freelance: 'ฟรีแลนซ์ / พอร์ตโฟลิโอ',
  shop: 'ร้านค้าออนไลน์',
  blog: 'บล็อก / สื่อ',
  other: 'ธุรกิจอื่น ๆ',
};

export const isBusinessType = (value: unknown): value is BusinessType =>
  typeof value === 'string' && (BUSINESS_TYPES as readonly string[]).includes(value);

/** `index.json` at the root of the template folder. */
export const templateIndexSchema = z.object({
  templates: z.array(z.string().trim().min(1)).min(1),
});
export type TemplateIndex = z.infer<typeof templateIndexSchema>;

/** `tokens.json`: the theme a site starts from when it uses this template. */
export const templateTokensSchema = z.object({
  colors: z.object({
    primary: hexColorSchema,
    accent: hexColorSchema,
    neutral: z.string().trim().min(1).max(40),
  }),
  fonts: z.object({
    heading: z.string().trim().min(1).max(80),
    body: z.string().trim().min(1).max(80),
  }),
  radius: z.enum(THEME_RADIUS_SCALES),
  button: z.enum(THEME_BUTTON_STYLES),
  density: z.enum(THEME_DENSITIES),
  colorMode: z.enum(THEME_COLOR_MODES),
  animation: z.enum(THEME_ANIMATIONS),
});
export type TemplateTokensFile = z.infer<typeof templateTokensSchema>;

/** `manifest.json` inside each pack. */
export const templateManifestSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  businessType: z.enum(BUSINESS_TYPES),
  description: z.string().trim().min(1).max(200),
  /** Style card the template starts from. */
  styleId: themeStylePresetSchema,
  preview: z.string().trim().min(1).default('preview.png'),
});
export type TemplateManifest = z.infer<typeof templateManifestSchema>;

/** Per-block-type style defaults (`section-styles.json`). */
export const sectionStylesSchema = z.record(blockStyleSchema.partial());
export type SectionStyles = z.infer<typeof sectionStylesSchema>;

/** Header/footer block trees plus the navigation menu (`global-blocks.json`, `menus.json`). */
export const templateGlobalBlocksSchema = z.object({
  header: blockTreeSchema,
  footer: blockTreeSchema,
});
export type TemplateGlobalBlocks = z.infer<typeof templateGlobalBlocksSchema>;

export const templateMenusSchema = z.object({
  header: menuItemsSchema.default([]),
  footer: menuItemsSchema.default([]),
});
export type TemplateMenus = z.infer<typeof templateMenusSchema>;

/** One sample page inside `pages/<slug>.json`. */
export const templatePageSchema = z.object({
  type: z.enum(CONTENT_TYPES).default('page'),
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(200),
  excerpt: z.string().trim().max(300).optional(),
  seoDescription: z.string().trim().max(160).optional(),
  blocks: blockTreeSchema.default([]),
});
export type TemplatePage = z.infer<typeof templatePageSchema>;

/** A loaded pack, as served to the admin and used by the wizard. */
export interface TemplateSummary {
  id: string;
  name: string;
  businessType: BusinessType;
  description: string;
  styleId: TemplateManifest['styleId'];
  previewUrl: string;
  tokens: ThemeTokens;
  pages: { slug: string; title: string; type: 'page' | 'post' }[];
}

/** `GET /design/tokens` and `PATCH` answer. */
export interface DesignTokens {
  tokens: ThemeTokens;
  templateId: string | null;
  styleId: string | null;
}

/** `POST /design/template/:id/apply` also reports what else it replaced. */
export interface DesignTemplateResult extends DesignTokens {
  headerFooterApplied: boolean;
}

export interface WizardPageSummary {
  id: string;
  title: string;
  slug: string;
  type: 'page' | 'post';
  status: string;
}

/** What step 5 of the wizard answers: the site plus the pages it created. */
export interface WizardSiteResult {
  siteId: string;
  name: string;
  subdomain: string;
  templateId: string;
  pages: WizardPageSummary[];
  published: number;
}

export const applyTemplateInputSchema = z.object({
  /** Also replaces header/footer with the new template's (content is untouched). */
  applyHeaderFooter: z.boolean().default(true),
});
export type ApplyTemplateInput = z.infer<typeof applyTemplateInputSchema>;

/**
 * Onboarding wizard (docs/design/04-ux.md 4.1). Steps 1-4 are the answers; step
 * 5 is the server building the site from the matching template. It extends the
 * plain create-site shape, so `POST /sites` keeps working for older clients.
 */
export const createSiteFromTemplateInputSchema = createSiteInputSchema.extend({
  businessType: z.enum(BUSINESS_TYPES).default('other'),
  /** Logo uploaded in step 2; optional. */
  logoMediaId: z.string().uuid().optional(),
  styleId: themeStylePresetSchema.default('soft'),
  primaryColor: hexColorSchema.optional(),
  accentColor: hexColorSchema.optional(),
  /** Publish the sample pages so the site is live the moment the wizard ends. */
  publishNow: z.boolean().default(true),
  /**
   * Extra languages to build right after the site exists. The default language
   * is always built; these are copied in the background and translated when the
   * assistant is available (docs/design/17-i18n.md 17.1, 04-ux.md 4.1 step 5).
   */
  locales: z.array(localeSchema).max(5).default([]),
});
export type CreateSiteFromTemplateInput = z.infer<typeof createSiteFromTemplateInputSchema>;

export const menuLocationSchema = z.enum(['header', 'footer']);
export type MenuLocation = z.infer<typeof menuLocationSchema>;

/** Horizontal position of a navigation menu on its bar. */
export const MENU_ALIGNS = ['left', 'center', 'right'] as const;
export const menuAlignSchema = z.enum(MENU_ALIGNS);
export type MenuAlign = z.infer<typeof menuAlignSchema>;

export const updateMenuInputSchema = z.object({
  items: menuItemsSchema,
  /**
   * Language this menu belongs to, or `null` for a menu shared by every
   * language (docs/design/17-i18n.md 17.5). Menus written before multi-language
   * sites stay `null`, so they keep working for all languages.
   */
  locale: z.string().trim().max(10).toLowerCase().nullable().optional(),
  /** Optional so older clients keep saving without moving the menu. */
  align: menuAlignSchema.optional(),
});
export type UpdateMenuInput = z.infer<typeof updateMenuInputSchema>;

export interface MenuDetail {
  location: MenuLocation;
  items: z.infer<typeof menuItemsSchema>;
  /** Language of this menu, or `null` when it serves every language. */
  locale: string | null;
  align: MenuAlign;
  updatedAt: string;
}

/**
 * Alignment is a property of the bar, not of one language, so it lives in
 * `sites.settings.menuAlign` and applies to every menu of that location.
 */
export const menuAlignFromSettings = (
  settings: unknown,
  location: MenuLocation,
): MenuAlign => {
  // Sites that never chose an alignment keep the look they already had: the
  // header menu at the end of the bar, the footer menu at its start.
  const fallback: MenuAlign = location === 'header' ? 'right' : 'left';
  if (settings === null || typeof settings !== 'object' || Array.isArray(settings)) {
    return fallback;
  }
  const align = (settings as Record<string, unknown>).menuAlign;
  if (align === null || typeof align !== 'object' || Array.isArray(align)) return fallback;
  const value = (align as Record<string, unknown>)[location];
  return value === 'center' || value === 'right' || value === 'left' ? value : fallback;
};

/** Merges section styles into a block tree without touching block props. */
export const withSectionStyles = (blocks: BlockTree, styles: SectionStyles): BlockTree =>
  blocks.map((block) => {
    const patch = styles[block.type] as Partial<BlockStyle> | undefined;
    return {
      ...block,
      style: { ...block.style, ...(patch ?? {}) },
      children: withSectionStyles(block.children, styles),
    };
  });
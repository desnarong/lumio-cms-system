import { z } from 'zod';
import { blockTreeSchema } from './blocks.js';
import { CONTENT_TYPES, seoSchema, type ContentType } from './content.js';
import { publicFormSchema } from './forms.js';
import { safeLinkSchema } from './links.js';

/**
 * Payload the renderer consumes through `/api/v1/public/:host/...`
 * (docs/design/12-api.md 12.7). It only ever carries published data, and the
 * renderer treats it as read-only: it never writes back to the API.
 */

export const menuItemSchema: z.ZodType<MenuItem, z.ZodTypeDef, unknown> = z.lazy(() =>
  z.object({
    label: z.string(),
    href: safeLinkSchema.optional(),
    contentId: z.string().optional(),
    children: z.array(menuItemSchema).default([]),
  }),
);
export type MenuItem = {
  label: string;
  href?: string;
  contentId?: string;
  children: MenuItem[];
};

export const menuItemsSchema = z.array(menuItemSchema);

/**
 * Reads stored menu items defensively: an item that no longer matches the shape
 * is skipped instead of taking the whole menu down with it.
 */
export const parseMenuItems = (value: unknown): MenuItem[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = menuItemSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
};

export const publicSiteSchema = z.object({
  id: z.string(),
  name: z.string(),
  subdomain: z.string(),
  localeDefault: z.string(),
  locales: z.array(z.string()),
  themeTokens: z.record(z.unknown()).default({}),
  settings: z.record(z.unknown()).default({}),
  /** Logo uploaded during onboarding, if the owner added one. */
  logoUrl: z.string().nullable().default(null),
});
export type PublicSite = z.infer<typeof publicSiteSchema>;

export const publicContentSchema = z.object({
  id: z.string(),
  type: z.enum(CONTENT_TYPES),
  title: z.string(),
  slug: z.string(),
  locale: z.string(),
  excerpt: z.string().nullable(),
  seo: seoSchema,
  /** Published block tree (`blocks_published`), never the draft. */
  blocks: blockTreeSchema,
  publishedAt: z.string().nullable(),
  updatedAt: z.string(),
  coverImage: z.string().nullable().default(null),
});
export type PublicContent = z.infer<typeof publicContentSchema>;

export const publicRedirectSchema = z.object({
  to: z.string(),
  code: z.number().int(),
});
export type PublicRedirect = z.infer<typeof publicRedirectSchema>;

/** One language a page can be read in, for the language switcher and hreflang. */
export const publicTranslationSchema = z.object({
  locale: z.string(),
  /** Path a visitor opens this language at (locale prefix included when needed). */
  path: z.string(),
  title: z.string().nullable().default(null),
  /** False when the site offers the language but this page has no version yet. */
  available: z.boolean().default(false),
});
export type PublicTranslation = z.infer<typeof publicTranslationSchema>;

export const publicMenusSchema = z.object({
  header: menuItemsSchema.default([]),
  footer: menuItemsSchema.default([]),
});
export type PublicMenus = z.infer<typeof publicMenusSchema>;

/**
 * Header and footer rendered on every page of the site. They are stored as
 * global blocks (docs/design/08-theme-design-panel.md 8.3) so editing them once
 * updates every page.
 */
export const publicGlobalBlocksSchema = z.object({
  header: blockTreeSchema.default([]),
  footer: blockTreeSchema.default([]),
});
export type PublicGlobalBlocks = z.infer<typeof publicGlobalBlocksSchema>;

/**
 * Languages one host offers (docs/design/17-i18n.md 17.1). The renderer's
 * middleware asks for this before honouring a visitor's `Accept-Language`, so an
 * English-preferring visitor is never sent to a language the site does not have.
 */
export const publicLocalesSchema = z.object({
  locales: z.array(z.string()).min(1),
  defaultLocale: z.string(),
  /**
   * Language carried by a subdomain such as `en.baandoi.example.com`, or null when
   * the host itself decided nothing.
   */
  localeFromHost: z.string().nullable().default(null),
});
export type PublicLocales = z.infer<typeof publicLocalesSchema>;

export const publicPageSchema = z.object({
  site: publicSiteSchema,
  /** Null when the path only matched a redirect (see `redirect`). */
  content: publicContentSchema.nullable().default(null),
  menus: publicMenusSchema,
  globalBlocks: publicGlobalBlocksSchema.default({ header: [], footer: [] }),
  /**
   * Definitions of the contact forms this page renders, so the renderer can draw
   * the fields without a second request (docs/design/12-api.md 12.7).
   */
  forms: z.array(publicFormSchema).default([]),
  /**
   * Effective language of the served content. It equals the default language when
   * the requested one had no page and the site fell back (docs/design/17-i18n.md 17.4).
   */
  locale: z.string(),
  /** True when the requested language had no page and the default was served. */
  isFallback: z.boolean().default(false),
  /** Every language this page can be read in, for the switcher and hreflang. */
  translations: z.array(publicTranslationSchema).default([]),
  /** Set when the requested slug was moved; the renderer answers 301/302. */
  redirect: publicRedirectSchema.nullable().default(null),
});
export type PublicPage = z.infer<typeof publicPageSchema>;

/** Short-lived link that shows one draft page; never indexed (design 10.4). */
export const previewLinkSchema = z.object({
  url: z.string().url(),
  expiresAt: z.string(),
});
export type PreviewLink = z.infer<typeof previewLinkSchema>;

/** Slug of the page served at `/`. */
export const HOME_SLUG = 'home';

/**
 * URL a published page or post lives at. The API uses it for the sitemap and
 * the renderer for its links, so both sides stay in sync.
 */
export const publicPathFor = (type: ContentType, slug: string): string => {
  if (type === 'post') return `/posts/${slug}`;
  return slug === HOME_SLUG ? '/' : `/${slug}`;
};

export const publicPostSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  publishedAt: z.string().nullable(),
  coverImage: z.string().nullable(),
});
export type PublicPostSummary = z.infer<typeof publicPostSummarySchema>;

export const publicPostListSchema = z.object({
  site: publicSiteSchema,
  menus: publicMenusSchema,
  globalBlocks: publicGlobalBlocksSchema.default({ header: [], footer: [] }),
  /** Effective language of the list (the default when the requested one is empty). */
  locale: z.string().default('th'),
  posts: z.array(publicPostSummarySchema),
});
export type PublicPostList = z.infer<typeof publicPostListSchema>;

export const publicSitemapUrlSchema = z.object({
  path: z.string(),
  lastmod: z.string().nullable(),
  type: z.enum(CONTENT_TYPES),
  /** Other languages this same page exists in, for `hreflang` in the sitemap. */
  alternates: z.array(publicTranslationSchema).default([]),
});
export type PublicSitemapUrl = z.infer<typeof publicSitemapUrlSchema>;

/** Shop products are not content rows but still belong in sitemap.xml. */
export const publicShopSitemapUrlSchema = z.object({
  path: z.string(),
  lastmod: z.string().nullable(),
});
export type PublicShopSitemapUrl = z.infer<typeof publicShopSitemapUrlSchema>;

export const publicSitemapSchema = z.object({
  site: publicSiteSchema,
  urls: z.array(publicSitemapUrlSchema),
  shop: z.array(publicShopSitemapUrlSchema).default([]),
});
export type PublicSitemap = z.infer<typeof publicSitemapSchema>;

/** Filters accepted by the public post list. */
export const publicPostListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type PublicPostListQuery = z.infer<typeof publicPostListQuerySchema>;

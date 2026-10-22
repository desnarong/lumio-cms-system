import { z } from 'zod';
import type { BlockNode, BlockTree } from './blocks.js';
import { slugSchema, type ContentStatus, type ContentType } from './content.js';
import { DEFAULT_LOCALE, localeSchema } from './locale.js';
import { publicPathFor } from './public.js';

/**
 * Multi-language sites (docs/design/17-i18n.md). A page in another language is a
 * separate row linked to its siblings through `translation_group_id`, and the URL
 * carries the locale (`/en/about`) except for the site's default language, which
 * stays prefix-free so existing links keep working.
 *
 * The languages themselves live in `locale.ts`, which is a leaf module: that is
 * what lets `forms.ts` tag a form with a language without importing this file.
 */
export * from './locale.js';

/** Site settings screen: which languages the site offers (docs/design/17-i18n.md 17.1). */
export const updateSiteLocalesInputSchema = z.object({
  locales: z.array(localeSchema).min(1).max(10),
  localeDefault: localeSchema.optional(),
});
export type UpdateSiteLocalesInput = z.infer<typeof updateSiteLocalesInputSchema>;

/**
 * Dedupes a locale list, lowercases it and always keeps the default language
 * first, so a site can never offer a language that has no content home.
 */
export const normalizeLocales = (
  locales: readonly string[],
  defaultLocale: string = DEFAULT_LOCALE,
): string[] => {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const raw of [defaultLocale, ...locales]) {
    const locale = raw.trim().toLowerCase();
    if (locale.length === 0 || locale.length > 10 || seen.has(locale)) continue;
    seen.add(locale);
    ordered.push(locale);
  }
  return ordered.length > 0 ? ordered : [defaultLocale];
};

/** Languages other than the default one; these are the ones with a URL prefix. */
export const otherLocales = (
  locales: readonly string[],
  defaultLocale: string = DEFAULT_LOCALE,
): string[] => normalizeLocales(locales, defaultLocale).filter((locale) => locale !== defaultLocale);

export const isLocaleOffered = (locales: readonly string[], locale: string): boolean =>
  locales.includes(locale);

/**
 * URL a published page or post lives at in a given language. The default language
 * has no prefix; every other one is served under `/{locale}` (docs/design/17-i18n.md 17.1).
 */
export const localePathFor = (
  type: ContentType,
  slug: string,
  locale: string,
  defaultLocale: string = DEFAULT_LOCALE,
): string => {
  const base = publicPathFor(type, slug);
  if (locale === defaultLocale) return base;
  return `/${locale}${base === '/' ? '' : base}`;
};

export interface LocalePath {
  locale: string;
  /** Path without the locale prefix, always starting with `/`. */
  path: string;
  /** True when the incoming path carried a locale segment. */
  hasPrefix: boolean;
}

/**
 * Splits `/{locale}/...` off an incoming path. The renderer uses it (in
 * middleware) so one set of routes serves every language; passing the default
 * language as a prefix is also flagged, which lets the caller canonicalise it away.
 */
export const splitLocalePath = (
  pathname: string,
  locales: readonly string[],
  defaultLocale: string = DEFAULT_LOCALE,
): LocalePath => {
  const clean = pathname.split('?')[0] ?? pathname;
  const segments = clean.split('/').filter((segment) => segment.length > 0);
  const [first, ...rest] = segments;

  if (first && locales.includes(first)) {
    return { locale: first, path: rest.length > 0 ? `/${rest.join('/')}` : '/', hasPrefix: true };
  }
  return {
    locale: defaultLocale,
    path: clean.startsWith('/') ? clean : `/${clean}`,
    hasPrefix: false,
  };
};

export interface HreflangLink {
  hreflang: string;
  href: string;
}

/** One entry of a parsed `Accept-Language` header. */
export interface AcceptedLanguage {
  /** Lowercased language tag, e.g. `en` or `pt-br`. */
  tag: string;
  /** Client preference between 0 and 1 (`q=0` means "not acceptable"). */
  quality: number;
}

/**
 * Parses `Accept-Language` (RFC 9110) into preference order. Malformed entries
 * are skipped rather than throwing: a header is attacker-controlled input and
 * the worst case must be "fall back to the default language".
 */
export const parseAcceptLanguage = (header: string | null | undefined): AcceptedLanguage[] => {
  if (typeof header !== 'string' || header.trim().length === 0) return [];

  const parsed: AcceptedLanguage[] = [];
  for (const part of header.split(',')) {
    const [rawTag, ...params] = part.split(';');
    const tag = (rawTag ?? '').trim().toLowerCase();
    if (tag.length === 0) continue;

    let quality = 1;
    for (const param of params) {
      const [name, value] = param.split('=');
      if (name?.trim().toLowerCase() === 'q') {
        const parsedQuality = Number((value ?? '').trim());
        quality = Number.isFinite(parsedQuality) ? Math.min(1, Math.max(0, parsedQuality)) : 0;
      }
    }
    parsed.push({ tag, quality });
  }

  // Stable sort: equal quality keeps the order the client sent.
  return parsed
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => b.entry.quality - a.entry.quality || a.index - b.index)
    .map(({ entry }) => entry);
};

/**
 * Picks the best language a visitor's browser asks for out of the languages the
 * site actually offers (docs/design/17-i18n.md 17.4). A `pt-br` request matches
 * an offered `pt`, and anything unmatched falls back to the default language, so
 * a Thai-only site never sends an English-preferring visitor to an empty page.
 */
export const negotiateLocale = (
  acceptLanguage: string | null | undefined,
  offered: readonly string[],
  defaultLocale: string = DEFAULT_LOCALE,
): string => {
  const languages = normalizeLocales(offered, defaultLocale);
  const accepted = parseAcceptLanguage(acceptLanguage).filter((entry) => entry.quality > 0);
  if (accepted.length === 0) return defaultLocale;

  for (const { tag } of accepted) {
    if (tag === '*') return defaultLocale;

    const exact = languages.find((locale) => locale === tag);
    if (exact) return exact;

    // `pt-br` also satisfies an offered `pt`, but not the other way round.
    const primary = tag.split('-')[0] ?? '';
    const partial = languages.find((locale) => locale.split('-')[0] === primary);
    if (partial) return partial;
  }

  return defaultLocale;
};

export interface LocaleHost {
  /** Hostname with the language label removed. */
  host: string;
  /** Language the subdomain asked for, or null when there was no label. */
  locale: string | null;
}

/**
 * Language subdomains (docs/design/17-i18n.md 17.1): `en.baandoi.example.com`
 * serves the English version of `baandoi.example.com`. Only a leading label that
 * is one of the offered languages is treated as such, so a real subdomain named
 * `en` is the one exception the docs already call out.
 */
export const splitLocaleHost = (
  hostname: string,
  offered: readonly string[],
  defaultLocale: string = DEFAULT_LOCALE,
): LocaleHost => {
  const host = hostname.trim().toLowerCase().replace(/\.$/, '');
  const [label, ...rest] = host.split('.');
  const languages = normalizeLocales(offered, defaultLocale);

  if (label && languages.includes(label) && rest.length > 0) {
    return { host: rest.join('.'), locale: label };
  }
  return { host, locale: null };
}

/**
 * `<link rel="alternate" hreflang>` entries for one page: every language it
 * exists in, plus `x-default` pointing at the default language
 * (docs/design/17-i18n.md 17.4 rule 5).
 */
export const buildHreflangLinks = (
  entries: readonly { locale: string; href: string }[],
  defaultLocale: string = DEFAULT_LOCALE,
): HreflangLink[] => {
  const links: HreflangLink[] = entries.map((entry) => ({
    hreflang: entry.locale,
    href: entry.href,
  }));
  const fallback = entries.find((entry) => entry.locale === defaultLocale);
  if (fallback) links.push({ hreflang: 'x-default', href: fallback.href });
  return links;
};

/**
 * `hreflang` map for a page's `<link rel="alternate">` tags and the sitemap: one
 * entry per language the page actually exists in, plus `x-default` for the
 * default language (docs/design/17-i18n.md 17.4 rule 5).
 */
export const hreflangMap = (
  entries: readonly { locale: string; href: string; available: boolean }[],
  defaultLocale: string = DEFAULT_LOCALE,
): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.available) map[entry.locale] = entry.href;
  }
  const fallback = map[defaultLocale];
  if (fallback) map['x-default'] = fallback;
  return map;
};

/** One language of a page, as the admin "which languages exist" badge shows it. */
export interface ContentTranslationLink {
  locale: string;
  /** Id of the page in this language, or `null` when it has not been created yet. */
  contentId: string | null;
  title: string | null;
  slug: string | null;
  status: ContentStatus | null;
  /** True once the translation exists at all (draft counts). */
  exists: boolean;
}

export interface ContentTranslations {
  /** Group every language of this page shares. */
  groupId: string;
  defaultLocale: string;
  /** One item per language the site offers, in the site's own order. */
  items: ContentTranslationLink[];
}

/** Fills a coverage list out to every offered language, marking the missing ones. */
export const translationCoverage = (
  groupId: string,
  locales: readonly string[],
  found: readonly Omit<ContentTranslationLink, 'exists'>[],
  defaultLocale: string = DEFAULT_LOCALE,
): ContentTranslations => ({
  groupId,
  defaultLocale,
  items: normalizeLocales(locales, defaultLocale).map((locale) => {
    const match = found.find((item) => item.locale === locale);
    return match
      ? { ...match, exists: true }
      : { locale, contentId: null, title: null, slug: null, status: null, exists: false };
  }),
});

/** Creating a translation copies the block structure, then optionally translates the copy. */
export const createTranslationInputSchema = z.object({
  locale: localeSchema,
  /** Defaults to the source page's slug; the API rejects one already taken. */
  slug: slugSchema.optional(),
  title: z.string().trim().min(1).max(200).optional(),
  /** Ask the AI assistant to translate the text too (needs a configured provider). */
  translate: z.boolean().default(false),
});
export type CreateTranslationInput = z.infer<typeof createTranslationInputSchema>;

/**
 * Props that carry user-facing copy. Only these are offered to the assistant for
 * translation, so links, ids, colours and layout values are never rewritten.
 */
export const TRANSLATABLE_PROP_KEYS = [
  'text',
  'heading',
  'subheading',
  'eyebrow',
  'title',
  'subtitle',
  'description',
  'label',
  'caption',
  'alt',
  'buttonLabel',
  'submitLabel',
  'successMessage',
  'quote',
  'author',
  'body',
] as const;

const TRANSLATABLE_KEYS = new Set<string>(TRANSLATABLE_PROP_KEYS);

export interface TranslatableText {
  blockType: string;
  /** Prop key, or `items.title` for entries inside a repeatable list. */
  key: string;
  text: string;
}

/**
 * Visits every translatable string in a block tree, in a stable order, and
 * returns a new tree with the visitor's answers applied. One walker backs both
 * `collectBlockTexts` and `applyBlockTranslations`, so gathered text and applied
 * translation can never drift out of order.
 */
export const mapBlockTexts = (
  blocks: BlockNode[],
  visit: (text: string, info: TranslatableText) => string,
): BlockNode[] => {
  const mapNode = (node: BlockNode): BlockNode => {
    const props: Record<string, unknown> = { ...node.props };

    for (const [key, value] of Object.entries(node.props)) {
      if (typeof value === 'string' && TRANSLATABLE_KEYS.has(key) && value.trim().length > 0) {
        props[key] = visit(value, { blockType: node.type, key, text: value });
        continue;
      }
      if (Array.isArray(value)) {
        props[key] = value.map((entry) => {
          if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return entry;
          const record = entry as Record<string, unknown>;
          const next: Record<string, unknown> = { ...record };
          for (const [innerKey, innerValue] of Object.entries(record)) {
            if (
              typeof innerValue === 'string' &&
              TRANSLATABLE_KEYS.has(innerKey) &&
              innerValue.trim().length > 0
            ) {
              next[innerKey] = visit(innerValue, {
                blockType: node.type,
                key: `${key}.${innerKey}`,
                text: innerValue,
              });
            }
          }
          return next;
        });
      }
    }

    return { ...node, props, children: node.children.map(mapNode) };
  };

  return blocks.map(mapNode);
};

/** Copy the assistant may translate, in reading order. */
export const collectBlockTexts = (blocks: BlockNode[]): TranslatableText[] => {
  const found: TranslatableText[] = [];
  mapBlockTexts(blocks, (text, info) => {
    found.push(info);
    return text;
  });
  return found;
};

/** Applies translated strings on top of the original tree, position by position. */
export const applyBlockTranslations = (
  blocks: BlockNode[],
  translated: readonly string[],
): BlockNode[] => {
  let index = 0;
  return mapBlockTexts(blocks, () => translated[index++] ?? '');
};

/**
 * Positions in a translated page that still read like the source language: empty
 * copy, or text byte-identical to the source at the same position. A position with
 * no counterpart in the source counts as missing too, so nothing is skipped
 * silently (docs/design/17-i18n.md 17.4 rule 2: translate only what the user asks).
 */
export const missingTranslationIndexes = (
  current: readonly TranslatableText[],
  source: readonly TranslatableText[] = [],
): number[] => {
  const indexes: number[] = [];
  current.forEach((entry, index) => {
    const original = source[index]?.text;
    if (entry.text.trim().length === 0 || original === undefined || entry.text === original) {
      indexes.push(index);
    }
  });
  return indexes;
};

/** Asks to finish translating an existing page in its own language. */
export const translateContentInputSchema = z.object({
  /**
   * When true (the default) only the texts that are still in the source language
   * are translated, so pressing the button again fills the remaining gaps.
   */
  onlyMissing: z.boolean().default(true),
});
export type TranslateContentInput = z.infer<typeof translateContentInputSchema>;

export interface TranslateContentResult {
  /** How many strings the assistant translated in this run. */
  translatedCount: number;
  /** How many strings the page has in total. */
  totalCount: number;
  /** The updated copy, for the editor to apply as a single undo step. */
  blocks: BlockTree;
}
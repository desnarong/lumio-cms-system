import {
  buildJsonLd,
  buildPageSeo,
  hreflangMap,
  localePathFor,
  resolvePageSeo,
  type JsonLd,
  type PageSeo,
  type PublicPage,
} from '@lumio/shared';
import { siteOrigin } from './lib/host';
import { ogImageUrl } from './lib/og';

export { buildJsonLd, buildPageSeo, resolvePageSeo };
export type { JsonLd, PageSeo };

/** Canonical URL of the page in its own language (docs/design/17-i18n.md 17.4). */
export const canonicalFor = (page: PublicPage, host: string): string => {
  const { content, site } = page;
  if (!content) return siteOrigin(host);
  return `${siteOrigin(host)}${localePathFor(
    content.type,
    content.slug,
    content.locale,
    site.localeDefault,
  )}`;
};

/**
 * SEO payload for a published page. The editor's `seo` overrides win; anything
 * left empty falls back to the title, excerpt and site name
 * (docs/design/14-seo-performance.md 14.1). Other languages of the page become
 * `hreflang` alternates so search engines link the versions together.
 */
export const buildMetadata = (page: PublicPage, host: string): PageSeo => {
  const { site, content } = page;
  if (!content) throw new Error('PageView requires published content');

  const origin = siteOrigin(host);
  const languages = hreflangMap(
    page.translations.map((entry) => ({
      locale: entry.locale,
      href: `${origin}${entry.path}`,
      available: entry.available,
    })),
    site.localeDefault,
  );

  const resolved = resolvePageSeo({
    seo: content.seo,
    title: content.title,
    siteName: site.name,
    canonical: canonicalFor(page, host),
    languages,
    excerpt: content.excerpt,
    type: content.type === 'post' ? 'article' : 'website',
  });

  // An owner-set image wins; otherwise every page gets a generated card, so a
  // shared link never shows a blank preview (docs/design/14-seo-performance.md 14.3).
  return buildPageSeo({
    ...resolved,
    ogImage: resolved.ogImage ?? ogImageUrl(origin, resolved.title, site.name),
    favicon: site.faviconUrl,
  });
};

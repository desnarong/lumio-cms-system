import { hreflangMap, type PublicShopSitemapUrl, type PublicSitemapUrl } from '@lumio/shared';
import { siteOrigin } from './host';

export interface SitemapEntry {
  url: string;
  lastModified?: Date;
  /** `hreflang` alternates so crawlers see every language of the page (design 17.4). */
  alternates?: { languages?: Record<string, string> };
}

/** Maps the API's URL list onto Next's sitemap format, `hreflang` included. */
export const toSitemapEntries = (
  origin: string,
  urls: PublicSitemapUrl[],
  defaultLocale = 'th',
): SitemapEntry[] =>
  urls.map((entry) => {
    const languages = hreflangMap(
      entry.alternates.map((alternate) => ({
        locale: alternate.locale,
        href: `${origin}${alternate.path}`,
        available: alternate.available,
      })),
      defaultLocale,
    );

    return {
      url: `${origin}${entry.path}`,
      ...(entry.lastmod ? { lastModified: new Date(entry.lastmod) } : {}),
      ...(Object.keys(languages).length > 0 ? { alternates: { languages } } : {}),
    };
  });

/** Shop URLs need no hreflang: the catalog follows the site language. */
export const shopSitemapEntries = (
  origin: string,
  urls: PublicShopSitemapUrl[],
): SitemapEntry[] =>
  urls.map((entry) => ({
    url: `${origin}${entry.path}`,
    ...(entry.lastmod ? { lastModified: new Date(entry.lastmod) } : {}),
  }));

export interface RobotsPolicy {
  rules: { userAgent: string; allow: string; disallow: string[] }[];
  sitemap: string;
}

/**
 * Every published page is crawlable; private surfaces (draft previews, cart,
 * checkout, order lookup and the renderer's own API) are excluded. A page that
 * the editor marked `noindex` also opts out through its own meta robots tag and
 * is dropped from the sitemap, because robots.txt cannot address one URL.
 */
export const robotsPolicy = (host: string): RobotsPolicy => ({
  rules: [
    {
      userAgent: '*',
      allow: '/',
      disallow: ['/preview/', '/api/', '/cart', '/checkout', '/order/', '/signin'],
    },
  ],
  sitemap: `${siteOrigin(host)}/sitemap.xml`,
});

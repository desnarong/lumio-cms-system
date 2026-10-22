import type { MetadataRoute } from 'next';
import { loadSitemap } from '../lib/content';
import { siteOrigin } from '../lib/host';
import { requestHost } from '../lib/request-host';
import { shopSitemapEntries, toSitemapEntries } from '../lib/sitemap';

export const revalidate = 3_600;

/**
 * `sitemap.xml` built from the published pages and posts the API reports
 * (docs/design/14-seo-performance.md 14.1). `noindex` pages never appear here.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = await requestHost();
  const { site, urls, shop } = await loadSitemap(host);
  const origin = siteOrigin(host);
  return [
    ...toSitemapEntries(origin, urls, site.localeDefault),
    ...shopSitemapEntries(origin, shop),
  ];
}

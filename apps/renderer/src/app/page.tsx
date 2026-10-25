import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HOME_SLUG } from '@lumio/shared';
import { PageView } from '../components/PageView';
import { loadPageShopProducts } from '../lib/block-shop';
import { loadPageOrNull } from '../lib/content';
import { applyRedirect } from '../lib/redirect';
import { requestHost } from '../lib/request-host';
import { requestLocale } from '../lib/request-locale';
import { buildMetadata } from '../seo';

/** Published pages are rebuilt by the publish pipeline, refreshed hourly as a safety net. */
export const revalidate = 3_600;

export async function generateMetadata(): Promise<Metadata> {
  const host = await requestHost();
  const locale = await requestLocale();
  const page = await loadPageOrNull(host, HOME_SLUG, locale);
  return page ? buildMetadata(page, host) : { title: 'ไม่พบหน้านี้' };
}

export default async function HomePage() {
  const host = await requestHost();
  const locale = await requestLocale();
  const page = await loadPageOrNull(host, HOME_SLUG, locale);
  if (!page) notFound();

  applyRedirect(page);
  if (!page.content) notFound();

  const shopProducts = await loadPageShopProducts(page, host, locale);
  return <PageView page={page} host={host} {...(shopProducts ? { shopProducts } : {})} />;
}

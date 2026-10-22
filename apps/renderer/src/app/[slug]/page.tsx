import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageView } from '../../components/PageView';
import { loadPageOrNull } from '../../lib/content';
import { applyRedirect } from '../../lib/redirect';
import { requestHost } from '../../lib/request-host';
import { requestLocale } from '../../lib/request-locale';
import { buildMetadata } from '../../seo';
import { reportNotFound } from '../../lib/not-found';

export const revalidate = 3_600;

export interface SlugPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
  const host = await requestHost();
  const locale = await requestLocale();
  const { slug } = await params;
  const page = await loadPageOrNull(host, slug, locale);
  return page ? buildMetadata(page, host) : { title: 'ไม่พบหน้านี้' };
}

export default async function SlugPage({ params }: SlugPageProps) {
  const host = await requestHost();
  const locale = await requestLocale();
  const { slug } = await params;
  const page = await loadPageOrNull(host, slug, locale);
  if (!page) {
    await reportNotFound(host, `/${slug}`);
    notFound();
  }

  applyRedirect(page);
  if (!page.content) {
    await reportNotFound(host, `/${slug}`);
    notFound();
  }

  return <PageView page={page} host={host} />;
}

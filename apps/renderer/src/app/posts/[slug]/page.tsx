import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageView } from '../../../components/PageView';
import { loadPageShopProducts } from '../../../lib/block-shop';
import { loadPageLatestPosts } from '../../../lib/block-posts';
import { loadPagePromotions } from '../../../lib/block-promotions';
import { loadPostOrNull } from '../../../lib/content';
import { applyRedirect } from '../../../lib/redirect';
import { requestHost } from '../../../lib/request-host';
import { requestLocale } from '../../../lib/request-locale';
import { buildMetadata } from '../../../seo';
import { reportNotFound } from '../../../lib/not-found';

export const revalidate = 3_600;

export interface PostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const host = await requestHost();
  const locale = await requestLocale();
  const { slug } = await params;
  const page = await loadPostOrNull(host, slug, locale);
  return page ? buildMetadata(page, host) : { title: 'ไม่พบบทความนี้' };
}

export default async function PostPage({ params }: PostPageProps) {
  const host = await requestHost();
  const locale = await requestLocale();
  const { slug } = await params;
  const page = await loadPostOrNull(host, slug, locale);
  if (!page) {
    await reportNotFound(host, `/posts/${slug}`);
    notFound();
  }

  applyRedirect(page);
  if (!page.content) {
    await reportNotFound(host, `/posts/${slug}`);
    notFound();
  }

  const [shopProducts, latestPosts, promotions] = await Promise.all([
    loadPageShopProducts(page, host, locale),
    loadPageLatestPosts(page, host, locale),
    loadPagePromotions(page, host),
  ]);
  return (
    <PageView
      page={page}
      host={host}
      {...(shopProducts ? { shopProducts } : {})}
      {...(latestPosts ? { latestPosts } : {})}
      {...(promotions ? { promotions } : {})}
    />
  );
}

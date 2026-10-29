import { localePathFor, type BlockNode, type PublicPage } from '@lumio/shared';
import type { LatestPostCard } from '@lumio/blocks';
import { loadPosts } from './content';

/** `2026-10-20T09:00:00.000Z` → `20/10/2026` (stable across ICU builds). */
const formatPostDate = (iso: string | null): string => {
  if (!iso) return '';
  const [date] = iso.split('T');
  const [year, month, day] = (date ?? '').split('-');
  return year && month && day ? `${day}/${month}/${year}` : '';
};

const blockReadsLatest = (block: BlockNode): boolean =>
  (block.type === 'posts' && (block.props as { source?: unknown }).source === 'latest') ||
  block.children.some(blockReadsLatest);

/** True when this page has a posts block that follows the blog. */
export const pageReadsLatestPosts = (page: PublicPage): boolean =>
  (page.content?.blocks ?? []).some(blockReadsLatest);

/**
 * Published posts for a "latest posts" block. Reading them from the public post
 * list means a new article shows up on its own and one that was deleted can
 * never appear from an old card.
 */
export const loadPageLatestPosts = async (
  page: PublicPage,
  host: string,
  locale?: string,
): Promise<LatestPostCard[] | undefined> => {
  if (!pageReadsLatestPosts(page)) return undefined;

  const list = await loadPosts(host, locale);
  return list.posts.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? '',
    date: formatPostDate(post.publishedAt),
    image: post.coverImage,
    link: localePathFor('post', post.slug, list.locale, list.site.localeDefault),
  }));
};

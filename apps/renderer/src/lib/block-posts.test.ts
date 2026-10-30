import { describe, expect, it, vi } from 'vitest';
import { defaultBlockStyle, type BlockNode, type PublicPage } from '@lumio/shared';
import { demoContents, demoForms, demoGlobalBlocks, demoMenus, demoSite } from './demo';

const { loadPostsMock } = vi.hoisted(() => ({ loadPostsMock: vi.fn() }));

vi.mock('./content', () => ({ loadPosts: loadPostsMock }));

import { loadPageLatestPosts, pageReadsLatestPosts } from './block-posts';

const block = (type: string, props: Record<string, unknown>): BlockNode => ({
  id: `b_${type}`,
  type,
  version: 1,
  props,
  style: defaultBlockStyle,
  children: [],
});

const pageWith = (blocks: BlockNode[]): PublicPage => {
  const content = demoContents.find((item) => item.slug === 'home');
  if (!content) throw new Error('demo home page is missing');
  return {
    site: demoSite,
    content: { ...content, blocks },
    menus: demoMenus,
    globalBlocks: demoGlobalBlocks,
    forms: demoForms,
    locale: content.locale,
    isFallback: false,
    translations: [],
    redirect: null,
  paywall: null,
  };
};

describe('pageReadsLatestPosts', () => {
  it('is true only when a posts block follows the blog', () => {
    expect(pageReadsLatestPosts(pageWith([block('posts', { source: 'latest' })]))).toBe(true);
    expect(pageReadsLatestPosts(pageWith([block('posts', { source: 'manual' })]))).toBe(false);
  });

  it('looks inside nested blocks too', () => {
    const section: BlockNode = {
      ...block('section', {}),
      children: [block('posts', { source: 'latest' })],
    };
    expect(pageReadsLatestPosts(pageWith([section]))).toBe(true);
  });
});

describe('loadPageLatestPosts', () => {
  it('returns nothing for a hand-written blog section', async () => {
    loadPostsMock.mockReset();
    const posts = await loadPageLatestPosts(
      pageWith([block('posts', { source: 'manual' })]),
      'shop.example.com',
    );

    expect(posts).toBeUndefined();
    expect(loadPostsMock).not.toHaveBeenCalled();
  });

  it('maps published posts, so deleted ones can never show', async () => {
    loadPostsMock.mockReset();
    loadPostsMock.mockResolvedValue({
      site: demoSite,
      menus: demoMenus,
      globalBlocks: demoGlobalBlocks,
      locale: 'th',
      posts: [
        {
          id: 'p1',
          title: 'ปลุกบ้านให้มีชีวิต',
          slug: 'daylight',
          excerpt: 'เรื่องของแสง',
          publishedAt: '2026-10-28T04:26:10.415+00:00',
          coverImage: 'https://cdn.example.com/cover.jpg',
        },
      ],
    });

    const posts = await loadPageLatestPosts(
      pageWith([block('posts', { source: 'latest' })]),
      'shop.example.com',
    );

    expect(posts).toEqual([
      {
        id: 'p1',
        title: 'ปลุกบ้านให้มีชีวิต',
        slug: 'daylight',
        excerpt: 'เรื่องของแสง',
        date: '28/10/2026',
        image: 'https://cdn.example.com/cover.jpg',
        link: '/posts/daylight',
      },
    ]);
  });
});

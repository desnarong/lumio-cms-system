import { describe, expect, it } from 'vitest';
import {
  HOME_SLUG,
  menuItemSchema,
  publicPageSchema,
  publicPathFor,
  publicPostListSchema,
} from './public.js';

const site = {
  id: '00000000-0000-4000-8000-0000000000a1',
  name: 'กาแฟบ้านดอย',
  subdomain: 'baandoi',
  localeDefault: 'th',
  locales: ['th'],
  themeTokens: { colorBrand: '#8B5E3C' },
  settings: {},
};

const content = {
  id: '00000000-0000-4000-8000-0000000000c1',
  type: 'page',
  title: 'หน้าแรก',
  slug: 'home',
  locale: 'th',
  excerpt: null,
  seo: { noindex: false },
  blocks: [],
  publishedAt: '2026-09-01T02:00:00.000Z',
  updatedAt: '2026-10-20T00:00:00.000Z',
  coverImage: null,
};

describe('publicPathFor', () => {
  it('serves the home page at the root', () => {
    expect(publicPathFor('page', HOME_SLUG)).toBe('/');
  });

  it('keeps pages at the top level and posts under /posts', () => {
    expect(publicPathFor('page', 'about')).toBe('/about');
    expect(publicPathFor('post', 'how-to-pick-beans')).toBe('/posts/how-to-pick-beans');
  });
});

describe('publicPageSchema', () => {
  it('accepts a published page', () => {
    const parsed = publicPageSchema.parse({
      site,
      content,
      menus: { header: [], footer: [] },
      locale: 'th',
      redirect: null,
    });

    expect(parsed.content?.title).toBe('หน้าแรก');
    expect(parsed.site.themeTokens).toEqual({ colorBrand: '#8B5E3C' });
    expect(parsed.isFallback).toBe(false);
    expect(parsed.translations).toEqual([]);
  });

  it('accepts a redirect-only answer with no content', () => {
    const parsed = publicPageSchema.parse({
      site,
      content: null,
      menus: {},
      locale: 'th',
      redirect: { to: '/about', code: 301 },
    });

    expect(parsed.content).toBeNull();
    expect(parsed.redirect).toEqual({ to: '/about', code: 301 });
    expect(parsed.menus).toEqual({ header: [], footer: [] });
  });

  it('rejects an unknown content type', () => {
    const result = publicPageSchema.safeParse({
      site,
      content: { ...content, type: 'product' },
      menus: {},
      locale: 'th',
    });

    expect(result.success).toBe(false);
  });

  it('carries the languages a page can be read in', () => {
    const parsed = publicPageSchema.parse({
      site: { ...site, locales: ['th', 'en'] },
      content,
      menus: {},
      locale: 'th',
      isFallback: true,
      translations: [
        { locale: 'th', path: '/', title: 'หน้าแรก', available: true },
        { locale: 'en', path: '/en', title: null, available: false },
      ],
    });

    expect(parsed.isFallback).toBe(true);
    expect(parsed.translations[1]).toEqual({
      locale: 'en',
      path: '/en',
      title: null,
      available: false,
    });
  });
});

describe('menuItemSchema', () => {
  it('reads a nested menu tree and defaults missing children', () => {
    const items = menuItemSchema.array().parse([
      { label: 'สินค้า', children: [{ label: 'กาแฟ', href: '/coffee' }] },
      { label: 'หน้าแรก', href: '/' },
    ]);

    expect(items[0]?.children[0]?.label).toBe('กาแฟ');
    expect(items[1]?.children).toEqual([]);
  });
});

describe('publicPostListSchema', () => {
  it('carries the menus the list page needs for its header', () => {
    const parsed = publicPostListSchema.parse({
      site,
      menus: { header: [{ label: 'หน้าแรก', href: '/' }], footer: [] },
      posts: [
        {
          id: '00000000-0000-4000-8000-0000000000c3',
          title: 'เลือกเมล็ดกาแฟ',
          slug: 'how-to-pick-beans',
          excerpt: 'เริ่มจากดูระดับการคั่ว',
          publishedAt: '2026-10-01T02:00:00.000Z',
          coverImage: null,
        },
      ],
    });

    expect(parsed.menus.header).toHaveLength(1);
    expect(parsed.posts[0]?.slug).toBe('how-to-pick-beans');
  });
});

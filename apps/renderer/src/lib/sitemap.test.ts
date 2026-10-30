import { describe, expect, it } from 'vitest';
import { robotsPolicy, shopSitemapEntries, toSitemapEntries } from './sitemap';

describe('toSitemapEntries', () => {
  it('prefixes every path with the site origin', () => {
    const entries = toSitemapEntries('https://baandoi.example.com', [
      { path: '/', lastmod: '2026-10-20T00:00:00.000Z', type: 'page', alternates: [] },
      { path: '/posts/beans', lastmod: null, type: 'post', alternates: [] },
    ]);

    expect(entries[0]?.url).toBe('https://baandoi.example.com/');
    expect(entries[0]?.lastModified).toEqual(new Date('2026-10-20T00:00:00.000Z'));
    expect(entries[1]).toEqual({ url: 'https://baandoi.example.com/posts/beans' });
  });

  it('adds hreflang alternates for a translated page', () => {
    const entries = toSitemapEntries(
      'https://baandoi.example.com',
      [
        {
          path: '/about',
          lastmod: null,
          type: 'page',
          alternates: [
            { locale: 'th', path: '/about', title: 'เกี่ยวกับเรา', available: true },
            { locale: 'en', path: '/en/about', title: 'About', available: true },
          ],
        },
      ],
      'th',
    );

    expect(entries[0]?.alternates?.languages).toEqual({
      th: 'https://baandoi.example.com/about',
      en: 'https://baandoi.example.com/en/about',
      'x-default': 'https://baandoi.example.com/about',
    });
  });

  it('handles an empty sitemap', () => {
    expect(toSitemapEntries('https://baandoi.example.com', [])).toEqual([]);
  });
});

describe('robotsPolicy', () => {
  it('allows crawling and points at the sitemap, skipping private paths', () => {
    expect(robotsPolicy('baandoi.example.com')).toEqual({
      rules: [
        {
          userAgent: '*',
          allow: '/',
          disallow: ['/preview/', '/api/', '/cart', '/checkout', '/order/', '/signin'],
        },
      ],
      sitemap: 'https://baandoi.example.com/sitemap.xml',
    });
  });

  it('keeps loopback preview on http', () => {
    expect(robotsPolicy('localhost:49200').sitemap).toBe('http://localhost:49200/sitemap.xml');
  });
});

describe('shopSitemapEntries', () => {
  it('maps product paths and keeps lastmod when the API has one', () => {
    const entries = shopSitemapEntries('https://baandoi.example.com', [
      { path: '/shop/medium-roast', lastmod: '2026-10-21T00:00:00.000Z' },
      { path: '/shop/mug', lastmod: null },
    ]);

    expect(entries[0]?.url).toBe('https://baandoi.example.com/shop/medium-roast');
    expect(entries[0]?.lastModified?.toISOString()).toBe('2026-10-21T00:00:00.000Z');
    expect(entries[1]).toEqual({ url: 'https://baandoi.example.com/shop/mug' });
  });
});

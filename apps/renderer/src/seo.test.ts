import { describe, expect, it } from 'vitest';
import { buildJsonLd, buildPageSeo, localePathFor, type PublicPage } from '@lumio/shared';
import { demoContents, demoForms, demoGlobalBlocks, demoMenus, demoSite } from './lib/demo';
import { buildMetadata, canonicalFor } from './seo';

const pageOf = (slug: string, type: 'page' | 'post' = 'page', locale = 'th'): PublicPage => {
  const content = demoContents.find(
    (item) => item.slug === slug && item.type === type && item.locale === locale,
  );
  if (!content) throw new Error(`demo content "${slug}" is missing`);

  const translations = demoSite.locales.map((entry) => {
    const match = demoContents.find(
      (item) => item.type === content.type && item.slug === content.slug && item.locale === entry,
    );
    return {
      locale: entry,
      path: localePathFor(content.type, content.slug, entry, demoSite.localeDefault),
      title: match?.title ?? null,
      available: Boolean(match),
    };
  });

  return {
    site: demoSite,
    content,
    menus: demoMenus,
    globalBlocks: demoGlobalBlocks,
    forms: demoForms,
    locale: content.locale,
    isFallback: false,
    translations,
    redirect: null,
  };
};

describe('canonicalFor', () => {
  it('uses the site origin and the public path', () => {
    expect(canonicalFor(pageOf('home'), 'baandoi.example.com')).toBe('https://baandoi.example.com/');
    expect(canonicalFor(pageOf('how-to-pick-beans', 'post'), 'baandoi.example.com')).toBe(
      'https://baandoi.example.com/posts/how-to-pick-beans',
    );
  });

  it('uses the language prefix of a translated page', () => {
    expect(canonicalFor(pageOf('home', 'page', 'en'), 'baandoi.example.com')).toBe(
      'https://baandoi.example.com/en',
    );
  });
});

describe('buildMetadata', () => {
  it('prefers the SEO title the editor saved', () => {
    const seo = buildMetadata(pageOf('home'), 'baandoi.example.com');
    expect(seo.title).toBe('กาแฟบ้านดอย — กาแฟคั่วสดใหม่เชียงใหม่');
    expect(seo.alternates?.canonical).toBe('https://baandoi.example.com/');
    expect(seo.openGraph.type).toBe('website');
  });

  it('lists the other languages as hreflang alternates', () => {
    const seo = buildMetadata(pageOf('home'), 'baandoi.example.com');
    expect(seo.alternates?.languages).toEqual({
      th: 'https://baandoi.example.com/',
      en: 'https://baandoi.example.com/en',
      'x-default': 'https://baandoi.example.com/',
    });
  });

  it('composes a title and description when the editor left them empty', () => {
    const seo = buildMetadata(pageOf('about'), 'baandoi.example.com');
    expect(seo.title).toBe('เกี่ยวกับเรา — กาแฟบ้านดอย');
    expect(seo.description).toBe('เริ่มคั่วกาแฟให้เพื่อนบ้านตั้งแต่ปี 2015');
  });

  it('marks a post as an article', () => {
    const seo = buildMetadata(pageOf('how-to-pick-beans', 'post'), 'baandoi.example.com');
    expect(seo.openGraph.type).toBe('article');
    expect(seo.twitter.card).toBe('summary_large_image');
  });

  it('adds robots noindex when the page asks for it', () => {
    const hidden: PublicPage = {
      ...pageOf('about'),
      content: { ...pageOf('about').content!, seo: { noindex: true } },
    };
    expect(buildMetadata(hidden, 'baandoi.example.com').robots).toEqual({
      index: false,
      follow: false,
    });
  });

  it('uses the uploaded favicon as the browser-tab icon', () => {
    const page: PublicPage = {
      ...pageOf('home'),
      site: { ...demoSite, faviconUrl: 'https://cdn.example.com/icon.png' },
    };
    expect(buildMetadata(page, 'baandoi.example.com').icons).toEqual({
      icon: 'https://cdn.example.com/icon.png',
      apple: 'https://cdn.example.com/icon.png',
    });
  });

  it('leaves the icon unset when the site has no favicon', () => {
    expect(buildMetadata(pageOf('home'), 'baandoi.example.com').icons).toBeUndefined();
  });
});

describe('buildPageSeo', () => {
  it('always emits an Open Graph title and site name', () => {
    const seo = buildPageSeo({ title: 'หน้าแรก', siteName: 'ร้านกาแฟ' });
    expect(seo.openGraph.title).toBe('หน้าแรก');
    expect(seo.openGraph.siteName).toBe('ร้านกาแฟ');
    expect(seo.twitter.card).toBe('summary_large_image');
  });

  it('omits optional fields when they are not set', () => {
    const seo = buildPageSeo({ title: 'x', siteName: 'y' });
    expect(seo.alternates).toBeUndefined();
    expect(seo.openGraph.images).toBeUndefined();
  });
});

describe('buildJsonLd', () => {
  it('describes the site on every page', () => {
    const graph = buildJsonLd({
      site: { name: 'กาแฟบ้านดอย', url: 'https://baandoi.example.com' },
      content: {
        type: 'page',
        title: 'หน้าแรก',
        url: 'https://baandoi.example.com/',
      },
    });

    expect(graph.map((node) => node['@type'])).toEqual(['Organization', 'WebSite']);
    expect(graph[0]?.['@context']).toBe('https://schema.org');
  });

  it('adds an Article for posts with its dates', () => {
    const graph = buildJsonLd({
      site: { name: 'กาแฟบ้านดอย', url: 'https://baandoi.example.com' },
      content: {
        type: 'post',
        title: 'เลือกเมล็ดกาแฟ',
        url: 'https://baandoi.example.com/posts/beans',
        publishedAt: '2026-10-01T02:00:00.000Z',
        updatedAt: '2026-10-02T02:00:00.000Z',
      },
    });

    expect(graph.map((node) => node['@type'])).toContain('Article');
    const article = graph.find((node) => node['@type'] === 'Article');
    expect(article?.['datePublished']).toBe('2026-10-01T02:00:00.000Z');
  });

  it('turns an FAQ block into FAQPage and a contact block into LocalBusiness', () => {
    const graph = buildJsonLd({
      site: { name: 'คลินิกยิ้มสวย', url: 'https://yimsauy.example.com' },
      content: { type: 'page', title: 'ติดต่อ', url: 'https://yimsauy.example.com/contact' },
      blocks: [
        {
          type: 'faq',
          props: { items: [{ question: 'เปิดกี่โมง', answer: '09:00-20:00' }] },
        },
        { type: 'contact', props: { address: 'เชียงใหม่', phone: '053-000-000' } },
      ],
    });

    const types = graph.map((node) => node['@type']);
    expect(types).toContain('FAQPage');
    expect(types).toContain('LocalBusiness');
  });
});

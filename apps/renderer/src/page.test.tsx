import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { localePathFor, type PublicPage } from '@lumio/shared';
import { PageView } from './components/PageView';
import { demoContents, demoForms, demoGlobalBlocks, demoMenus, demoSite } from './lib/demo';

const HOST = 'baandoi.lumio.app';

const pageOf = (slug: string, locale = 'th'): PublicPage => {
  const content = demoContents.find((item) => item.slug === slug && item.locale === locale);
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

describe('PageView', () => {
  it('renders the published blocks through the block engine', () => {
    const html = renderToStaticMarkup(<PageView page={pageOf('home')} host={HOST} />);
    expect(html).toContain('lumio-hero');
    expect(html).toContain('lumio-features');
    expect(html).toContain('กาแฟคั่วสดจากดอย');
    expect(html).toContain('data-block-type="features"');
  });

  it('renders a single h1 for the page', () => {
    const html = renderToStaticMarkup(<PageView page={pageOf('home')} host={HOST} />);
    expect(html.match(/<h1/g) ?? []).toHaveLength(1);
  });

  it('adds a title heading only when the blocks have no h1', () => {
    const withH1 = renderToStaticMarkup(<PageView page={pageOf('home')} host={HOST} />);
    expect(withH1).not.toContain('site-page-title');

    const withoutH1 = renderToStaticMarkup(
      <PageView
        page={{
          ...pageOf('home'),
          content: {
            ...pageOf('home').content!,
            title: 'หน้าแรก',
            blocks: [pageOf('home').content!.blocks[1]!],
          },
        }}
        host={HOST}
      />,
    );
    expect(withoutH1).toContain('site-page-title');
    expect(withoutH1.match(/<h1/g) ?? []).toHaveLength(1);
  });

  it('renders the menus as crawlable links', () => {
    const html = renderToStaticMarkup(<PageView page={pageOf('home')} host={HOST} />);
    expect(html).toContain('aria-label="เมนูหลัก"');
    expect(html).toContain('href="/about"');
    expect(html).toContain('aria-label="เมนูส่วนท้าย"');
  });

  it('inlines structured data derived from the page', () => {
    const html = renderToStaticMarkup(<PageView page={pageOf('home')} host={HOST} />);
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain('"@type":"WebSite"');
  });

  it('applies the site brand color through design tokens', () => {
    const html = renderToStaticMarkup(<PageView page={pageOf('home')} host={HOST} />);
    expect(html).toContain('--color-primary:#8B5E3C');
  });

  it('renders the global header and footer blocks of the template', () => {
    const html = renderToStaticMarkup(<PageView page={pageOf('home')} host={HOST} />);
    expect(html).toContain('โทรสอบถาม');
    expect(html).toContain('เปิดทุกวัน 07:00-18:00 น.');
  });

  it('shows the logo uploaded during onboarding instead of the site name', () => {
    const html = renderToStaticMarkup(
      <PageView
        page={{
          ...pageOf('home'),
          site: { ...demoSite, logoUrl: 'http://localhost:49100/media/baandoi/logo/logo.png' },
        }}
        host={HOST}
      />,
    );

    expect(html).toContain('site-header__logo');
    expect(html).toContain('http://localhost:49100/media/baandoi/logo/logo.png');
  });

  it('exposes the theme hooks the block stylesheet reads', () => {
    const html = renderToStaticMarkup(<PageView page={pageOf('home')} host={HOST} />);

    expect(html).toContain('data-button-style="soft"');
    expect(html).toContain('data-density="comfortable"');
    expect(html).toContain('data-animation="soft"');
    expect(html).toContain('--radius-lg:28px');
    expect(html).toContain('--density-scale:1');
  });

  it('pins dark mode when the site tokens ask for it', () => {
    const html = renderToStaticMarkup(
      <PageView
        page={{
          ...pageOf('home'),
          site: {
            ...demoSite,
            themeTokens: { colors: { primary: '#0F172A', accent: '#22D3EE' }, colorMode: 'dark' },
          },
        }}
        host={HOST}
      />,
    );

    expect(html).toContain('data-theme="dark"');
  });

  it('renders the contact form the page carries, with no client script', () => {
    const html = renderToStaticMarkup(<PageView page={pageOf('home')} host={HOST} />);
    expect(html).toContain('lumio-form');
    expect(html).toContain('action="/forms/00000000-0000-4000-8000-0000000000f1"');
    expect(html).toContain('name="email"');
    expect(html).toContain('name="_hp"');
    expect(html).toContain('id="sent-00000000-0000-4000-8000-0000000000f1"');
    // The only script is the JSON-LD block; the form itself needs no JavaScript.
    expect(html.match(/<script/g) ?? []).toHaveLength(1);
  });

  it('renders nothing for a redirect-only response', () => {
    const html = renderToStaticMarkup(
      <PageView
        page={{
          site: demoSite,
          content: null,
          menus: demoMenus,
          globalBlocks: demoGlobalBlocks,
          forms: [],
          locale: 'th',
          isFallback: false,
          translations: [],
          redirect: { to: '/about', code: 301 },
        }}
        host={HOST}
      />,
    );
    expect(html).toBe('');
  });

  it('renders the language switcher with a link per language', () => {
    const html = renderToStaticMarkup(<PageView page={pageOf('home')} host={HOST} />);

    expect(html).toContain('lumio-language');
    expect(html).toContain('href="/en"');
    expect(html).toContain('hreflang="en"');
    expect(html).toContain('aria-current="true"');
  });

  it('shows a notice when the page fell back to the default language', () => {
    const html = renderToStaticMarkup(
      <PageView page={{ ...pageOf('about'), isFallback: true }} host={HOST} />,
    );

    expect(html).toContain('ยังไม่มีหน้านี้ในภาษาที่เลือก');
  });

  it('renders a translated page at its own language path', () => {
    const html = renderToStaticMarkup(<PageView page={pageOf('home', 'en')} host={HOST} />);

    expect(html).toContain('Ban Doi Coffee');
    expect(html).toContain('lang="en"');
  });
});

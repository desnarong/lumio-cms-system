import {
  BlockTreeRenderer,
  registerRenderBlocks,
  type LatestPostCard,
  type PromotionCard,
  type ShopProductCard,
} from '@lumio/blocks/render';
import { buildJsonLd, localeLabel, localePathFor, type BlockNode, type PublicPage } from '@lumio/shared';
import { siteOrigin } from '../lib/host';
import { languageLinks } from '../lib/languages';
import { fallbackTitle } from '../lib/page-title';
import { siteTheme } from '../lib/theme';
import { JsonLd } from './JsonLd';
import { PageViewTracker } from './PageViewTracker';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

// The render entry ships the block components without the editor panels.
registerRenderBlocks();

export interface PageViewProps {
  page: PublicPage;
  host: string;
  /** Draft preview: render the page but never record a page view. */
  preview?: boolean;
  /** Live shop products for a products block that reads the catalog. */
  shopProducts?: readonly ShopProductCard[];
  /** Published posts for a posts block that follows the blog. */
  latestPosts?: readonly LatestPostCard[];
  /** Live offers for a feature grid that follows the promotion list. */
  promotions?: readonly PromotionCard[];
}

/**
 * One published page or post: header, blocks, footer and the structured data
 * generated from them. It is a plain server component, so the output is static
 * HTML with no client JavaScript from the blocks.
 */
export const PageView = ({
  page,
  host,
  preview = false,
  shopProducts,
  latestPosts,
  promotions,
}: PageViewProps) => {
  const { site, content, menus, globalBlocks } = page;
  if (!content) return null;

  const origin = siteOrigin(host);
  const path = localePathFor(content.type, content.slug, content.locale, site.localeDefault);
  const url = `${origin}${path}`;
  const fallbackH1 = fallbackTitle(content.blocks, content.title);
  const theme = siteTheme(site.themeTokens);

  const jsonLd = buildJsonLd({
    site: {
      name: site.name,
      url: origin,
      description: typeof site.settings.description === 'string' ? site.settings.description : undefined,
    },
    content: {
      type: content.type,
      title: content.title,
      description: content.seo.description ?? content.excerpt ?? undefined,
      url,
      publishedAt: content.publishedAt,
      updatedAt: content.updatedAt,
    },
    blocks: content.blocks.map((block) => ({ type: block.type, props: block.props })),
  });

  const languages = languageLinks(page);
  // A switcher with nothing to switch to only adds an empty block to the bar.
  const chromeBlocks = (blocks: BlockNode[]): BlockNode[] =>
    languages.length > 1 ? blocks : blocks.filter((block) => block.type !== 'language-switcher');

  return (
    <div className="site" style={theme.style} {...theme.attributes}>
      <JsonLd data={jsonLd} />
      {preview ? null : <PageViewTracker path={path} />}
      <SiteHeader
        site={site}
        menus={menus}
        blocks={chromeBlocks(globalBlocks.header)}
        languages={languages}
        currentPath={path}
        {...(shopProducts ? { shopProducts } : {})}
      />
      {/*
        A page with no version in the requested language falls back to the default
        one; the notice tells the visitor why the language differs
        (docs/design/17-i18n.md 17.4 rule 4).
      */}
      {page.isFallback ? (
        <p className="site-locale-notice" role="note" lang={content.locale}>
          ยังไม่มีหน้านี้ในภาษาที่เลือก กำลังแสดง{localeLabel(content.locale)}แทน
        </p>
      ) : null}
      <main className="site-main" id="main">
        <article className="site-article" data-content-slug={content.slug} lang={content.locale}>
          {fallbackH1 ? <h1 className="site-page-title">{fallbackH1}</h1> : null}
          <BlockTreeRenderer
            blocks={content.blocks}
            forms={page.forms}
            languages={languages}
            {...(shopProducts ? { shopProducts } : {})}
            {...(latestPosts ? { latestPosts } : {})}
            {...(promotions ? { promotions } : {})}
          />
        </article>
      </main>
      <SiteFooter
        site={site}
        menus={menus}
        blocks={chromeBlocks(globalBlocks.footer)}
        languages={languages}
        {...(shopProducts ? { shopProducts } : {})}
      />
    </div>
  );
};
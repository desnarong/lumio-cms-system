import type { Metadata } from 'next';
import { buildPageSeo, localePathFor } from '@lumio/shared';
import { SiteFooter } from '../../components/SiteFooter';
import { SiteHeader } from '../../components/SiteHeader';
import { loadPosts } from '../../lib/content';
import { siteOrigin } from '../../lib/host';
import { requestHost } from '../../lib/request-host';
import { requestLocale } from '../../lib/request-locale';
import { siteTheme } from '../../lib/theme';
import { storefrontT } from '../../lib/messages';

export const revalidate = 3_600;

export async function generateMetadata(): Promise<Metadata> {
  const host = await requestHost();
  const locale = await requestLocale();
  const { site, locale: effective } = await loadPosts(host, locale);
  return buildPageSeo({
    title: storefrontT(effective)('posts.metaTitle', { site: site.name }),
    siteName: site.name,
    description: storefrontT(effective)('posts.metaDescription', { site: site.name }),
    canonical: `${siteOrigin(host)}${localePathFor('page', 'posts', effective, site.localeDefault)}`,
    favicon: site.faviconUrl,
  });
}

export default async function PostsPage() {
  const host = await requestHost();
  const locale = await requestLocale();
  const { site, menus, globalBlocks, posts, locale: effective } = await loadPosts(host, locale);
  const theme = siteTheme(site.themeTokens);
  const t = storefrontT(effective);

  return (
    <div className="site" style={theme.style} {...theme.attributes}>
      <SiteHeader
        site={site}
        menus={menus}
        blocks={globalBlocks.header}
        currentPath={localePathFor('page', 'posts', effective, site.localeDefault)}
        locale={effective}
      />
      <main className="site-main" id="main">
        <article className="site-article site-article--posts" lang={effective}>
          <h1 className="site-page-title">{t('posts.title')}</h1>
          {posts.length === 0 ? (
            <p className="site-empty">{t('posts.empty')}</p>
          ) : (
            <ul className="site-post-list">
              {posts.map((post) => (
                <li className="site-post-list__item" key={post.id}>
                  <a
                    className={
                      post.coverImage
                        ? 'site-post-list__link site-post-list__link--with-cover'
                        : 'site-post-list__link'
                    }
                    href={localePathFor('post', post.slug, effective, site.localeDefault)}
                  >
                    {post.coverImage ? (
                      <img
                        className="site-post-list__cover"
                        src={post.coverImage}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                    <div className="site-post-list__body">
                      <h2 className="site-post-list__title">{post.title}</h2>
                      {post.excerpt ? (
                        <p className="site-post-list__excerpt">{post.excerpt}</p>
                      ) : null}
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </article>
      </main>
      <SiteFooter site={site} menus={menus} blocks={globalBlocks.footer} locale={effective} />
    </div>
  );
}

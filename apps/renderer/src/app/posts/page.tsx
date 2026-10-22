import type { Metadata } from 'next';
import { buildPageSeo, localePathFor } from '@lumio/shared';
import { SiteFooter } from '../../components/SiteFooter';
import { SiteHeader } from '../../components/SiteHeader';
import { loadPosts } from '../../lib/content';
import { siteOrigin } from '../../lib/host';
import { requestHost } from '../../lib/request-host';
import { requestLocale } from '../../lib/request-locale';
import { siteTheme } from '../../lib/theme';

export const revalidate = 3_600;

export async function generateMetadata(): Promise<Metadata> {
  const host = await requestHost();
  const locale = await requestLocale();
  const { site, locale: effective } = await loadPosts(host, locale);
  return buildPageSeo({
    title: `บทความ — ${site.name}`,
    siteName: site.name,
    description: `เรื่องราวและความรู้ล่าสุดจาก ${site.name}`,
    canonical: `${siteOrigin(host)}${localePathFor('page', 'posts', effective, site.localeDefault)}`,
  });
}

export default async function PostsPage() {
  const host = await requestHost();
  const locale = await requestLocale();
  const { site, menus, globalBlocks, posts, locale: effective } = await loadPosts(host, locale);
  const theme = siteTheme(site.themeTokens);

  return (
    <div className="site" style={theme.style} {...theme.attributes}>
      <SiteHeader site={site} menus={menus} blocks={globalBlocks.header} />
      <main className="site-main" id="main">
        <article className="site-article" lang={effective}>
          <h1 className="site-page-title">บทความ</h1>
          {posts.length === 0 ? (
            <p className="site-empty">ยังไม่มีบทความที่เผยแพร่</p>
          ) : (
            <ul className="site-post-list">
              {posts.map((post) => (
                <li className="site-post-list__item" key={post.id}>
                  <a
                    className="site-post-list__link"
                    href={localePathFor('post', post.slug, effective, site.localeDefault)}
                  >
                    <h2 className="site-post-list__title">{post.title}</h2>
                    {post.excerpt ? (
                      <p className="site-post-list__excerpt">{post.excerpt}</p>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </article>
      </main>
      <SiteFooter site={site} menus={menus} blocks={globalBlocks.footer} />
    </div>
  );
}
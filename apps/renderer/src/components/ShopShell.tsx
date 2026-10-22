import type { ReactNode } from 'react';
import type { PublicGlobalBlocks, PublicMenus, PublicSite } from '@lumio/shared';
import { siteTheme } from '../lib/theme';
import { PageViewTracker } from './PageViewTracker';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

export interface ShopChrome {
  site: PublicSite;
  menus: PublicMenus;
  globalBlocks: PublicGlobalBlocks;
}

export interface ShopShellProps {
  chrome: ShopChrome;
  path: string;
  children: ReactNode;
  /** Optional heading block above the content (the product page uses its own). */
  hideTracker?: boolean;
}

/**
 * Header/footer and theme for the shop screens, which are not a single content
 * row and therefore cannot use `PageView`. Chrome comes from the same public API,
 * so the shop looks like the rest of the site after any template change.
 */
export const ShopShell = ({ chrome, path, children, hideTracker = false }: ShopShellProps) => {
  const theme = siteTheme(chrome.site.themeTokens);

  return (
    <div className="site" style={theme.style} {...theme.attributes}>
      {hideTracker ? null : <PageViewTracker path={path} />}
      <SiteHeader site={chrome.site} menus={chrome.menus} blocks={chrome.globalBlocks.header} />
      <main className="site-main shop-main" id="main">
        {children}
      </main>
      <SiteFooter site={chrome.site} menus={chrome.menus} blocks={chrome.globalBlocks.footer} />
    </div>
  );
};

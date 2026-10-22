import { BlockTreeRenderer } from '@lumio/blocks/render';
import type { BlockNode, MenuItem, PublicMenus, PublicSite } from '@lumio/shared';

export interface SiteNavProps {
  site: PublicSite;
  menus: PublicMenus;
  /** Global header blocks of the template (usually the call to action). */
  blocks?: BlockNode[];
}

const MenuList = ({ items }: { items: MenuItem[] }) => (
  <ul className="site-nav__list">
    {items.map((item, index) => (
      <li className="site-nav__item" key={`${item.href ?? item.label}-${index}`}>
        <a className="site-nav__link" href={item.href ?? '/'}>
          {item.label}
        </a>
        {item.children.length > 0 ? <MenuList items={item.children} /> : null}
      </li>
    ))}
  </ul>
);

/**
 * Header from the site's `header` menu plus the global header blocks of its
 * template (docs/design/08-theme-design-panel.md 8.3). Plain HTML, no client JS.
 */
export const SiteHeader = ({ site, menus, blocks = [] }: SiteNavProps) => (
  <header className="site-header">
    <a className="site-header__brand" href="/">
      {site.logoUrl ? (
        <img className="site-header__logo" src={site.logoUrl} alt={site.name} height={40} />
      ) : (
        site.name
      )}
    </a>
    {menus.header.length > 0 ? (
      <nav className="site-nav" aria-label="เมนูหลัก">
        <MenuList items={menus.header} />
      </nav>
    ) : null}
    {blocks.length > 0 ? (
      <div className="site-header__blocks">
        <BlockTreeRenderer blocks={blocks} />
      </div>
    ) : null}
  </header>
);

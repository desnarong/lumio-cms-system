import { BlockTreeRenderer, type LanguageLink, type ShopProductCard } from '@lumio/blocks/render';
import {
  menuAlignFromSettings,
  type BlockNode,
  type MenuItem,
  type PublicMenus,
  type PublicSite,
} from '@lumio/shared';
import { headerActions, headerHeight, logoHeight } from '../lib/chrome';

export interface SiteNavProps {
  site: PublicSite;
  menus: PublicMenus;
  /** Global header blocks of the template (usually the call to action). */
  blocks?: BlockNode[];
  /** Languages the page can be read in, so a switcher in the header works. */
  languages?: readonly LanguageLink[];
  /** Live shop products for a products block that reads the catalog. */
  shopProducts?: readonly ShopProductCard[];
  /** Path of the page being rendered, used to mark the matching menu item. */
  currentPath?: string;
}

const trimPath = (value: string): string => {
  const clean = value.split(/[?#]/)[0] ?? value;
  return clean.length > 1 ? clean.replace(/\/+$/, '') : clean;
};

const isCurrent = (href: string | null | undefined, currentPath?: string): boolean =>
  Boolean(currentPath) && trimPath(href ?? '/') === trimPath(currentPath ?? '');

const MenuList = ({
  items,
  currentPath,
}: {
  items: MenuItem[];
  currentPath?: string;
}) => (
  <ul className="site-nav__list">
    {items.map((item, index) => {
      const active = isCurrent(item.href, currentPath);
      return (
        <li className="site-nav__item" key={`${item.href ?? item.label}-${index}`}>
          <a
            className={active ? 'site-nav__link is-active' : 'site-nav__link'}
            href={item.href ?? '/'}
            {...(active ? { 'aria-current': 'page' as const } : {})}
          >
            {item.label}
          </a>
          {item.children.length > 0 ? (
            <MenuList items={item.children} currentPath={currentPath} />
          ) : null}
        </li>
      );
    })}
  </ul>
);

const CartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="20" height="20" aria-hidden="true">
    <path
      d="M3 4h2l2.4 10.4A2 2 0 0 0 9.35 16H18a2 2 0 0 0 1.94-1.5L21.5 8H6"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="10" cy="20" r="1.4" fill="currentColor" />
    <circle cx="18" cy="20" r="1.4" fill="currentColor" />
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="20" height="20" aria-hidden="true">
    <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M5 20c0-3.3 3.1-5.6 7-5.6s7 2.3 7 5.6"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.1-3.6-8.5s1.2-6.2 3.6-8.5Z"
      stroke="currentColor"
      strokeWidth="1.6"
    />
  </svg>
);

const HeaderActions = ({
  site,
  languages = [],
}: {
  site: PublicSite;
  languages?: readonly LanguageLink[];
}) => {
  const actions = headerActions(site);
  if (!actions.language && !actions.account && !actions.cart) return null;

  const active = languages.find((link) => link.active) ?? languages[0];
  const alternate = languages.find((link) => !link.active && link.available) ?? active;

  return (
    <div className="site-header__actions">
      {actions.cart ? (
        <a className="site-header__action" href="/cart" aria-label="ตะกร้าสินค้า" title="ตะกร้าสินค้า">
          <CartIcon />
        </a>
      ) : null}
      {actions.account ? (
        <a
          className="site-header__action"
          href="/signin"
          aria-label="บัญชีของฉัน"
          title="บัญชีของฉัน"
        >
          <UserIcon />
        </a>
      ) : null}
      {actions.language ? (
        <a
          className="site-header__action site-header__action--language"
          href={alternate?.href ?? '/'}
          aria-label="เปลี่ยนภาษา"
          title="เปลี่ยนภาษา"
          lang={alternate?.locale}
        >
          <GlobeIcon />
          <span>{alternate?.label ?? site.localeDefault.toUpperCase()}</span>
        </a>
      ) : null}
    </div>
  );
};

/**
 * Header from the site's `header` menu plus the global header blocks of its
 * template (docs/design/08-theme-design-panel.md 8.3). Plain HTML, no client JS.
 */
export const SiteHeader = ({
  site,
  menus,
  blocks = [],
  languages,
  currentPath,
  shopProducts,
}: SiteNavProps) => {
  const height = headerHeight(site);
  const logo = logoHeight(site);

  return (
    <header
      className="site-header"
      style={height === null ? undefined : { minHeight: `${height}px` }}
    >
      <a className="site-header__brand" href="/">
        {site.logoUrl ? (
          <img
            className="site-header__logo"
            src={site.logoUrl}
            alt={site.name}
            height={logo ?? 40}
            style={logo === null ? undefined : { height: logo + 'px' }}
          />
        ) : (
          site.name
        )}
      </a>
      {menus.header.length > 0 ? (
        <>
          <input
            type="checkbox"
            id="site-nav-toggle"
            className="site-nav__checkbox"
            aria-label="เมนู"
            aria-controls="site-nav-menu"
          />
          <label className="site-nav__toggle" htmlFor="site-nav-toggle">
            <span className="site-nav__toggle-bar" aria-hidden="true" />
          </label>
          <nav
            id="site-nav-menu"
            className={`site-nav site-nav--align-${menuAlignFromSettings(site.settings, 'header')}`}
            aria-label="เมนูหลัก"
          >
            <MenuList items={menus.header} currentPath={currentPath} />
          </nav>
        </>
      ) : null}
      {blocks.length > 0 ? (
        <div className="site-header__blocks">
          <BlockTreeRenderer
            blocks={blocks}
            {...(languages ? { languages } : {})}
            {...(shopProducts ? { shopProducts } : {})}
          />
        </div>
      ) : null}
      <HeaderActions site={site} {...(languages ? { languages } : {})} />
    </header>
  );
};

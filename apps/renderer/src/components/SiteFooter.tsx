import { BlockTreeRenderer } from '@lumio/blocks/render';
import type { BlockNode, PublicMenus, PublicSite } from '@lumio/shared';

export interface SiteFooterProps {
  site: PublicSite;
  menus: PublicMenus;
  /** Global footer blocks of the template (name, address, a link). */
  blocks?: BlockNode[];
}

export const SiteFooter = ({ site, menus, blocks = [] }: SiteFooterProps) => (
  <footer className="site-footer">
    {blocks.length > 0 ? (
      <div className="site-footer__blocks">
        <BlockTreeRenderer blocks={blocks} />
      </div>
    ) : (
      <p className="site-footer__name">{site.name}</p>
    )}
    {menus.footer.length > 0 ? (
      <nav className="site-nav site-nav--footer" aria-label="เมนูส่วนท้าย">
        <ul className="site-nav__list">
          {menus.footer.map((item, index) => (
            <li className="site-nav__item" key={`${item.href ?? item.label}-${index}`}>
              <a className="site-nav__link" href={item.href ?? '/'}>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    ) : null}
    <p className="site-footer__credit">สร้างด้วย Lumio</p>
  </footer>
);

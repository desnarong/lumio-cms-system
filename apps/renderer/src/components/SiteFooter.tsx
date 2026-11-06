import type { CSSProperties } from 'react';
import { BlockTreeRenderer, type LanguageLink, type ShopProductCard } from '@lumio/blocks/render';
import { Icon } from '@lumio/ui/icon';
import {
  menuAlignFromSettings,
  type BlockNode,
  type PublicMenus,
  type PublicSite,
} from '@lumio/shared';
import {
  footerBackground,
  footerBackgroundImage,
  footerCopyright,
  footerOverlay,
  legalLinks,
  socialLinks,
} from '../lib/chrome';
import { socialColors } from '@lumio/tokens';
import { storefrontT } from '../lib/messages';

export interface SiteFooterProps {
  site: PublicSite;
  menus: PublicMenus;
  /** Global footer blocks of the template (name, address, a link). */
  blocks?: BlockNode[];
  /** Languages the page can be read in, so a switcher in the footer works. */
  languages?: readonly LanguageLink[];
  /** Live shop products for a products block that reads the catalog. */
  shopProducts?: readonly ShopProductCard[];
  /** Request language for the footer's own labels; the active language link otherwise. */
  locale?: string | null;
}

type SocialKind = 'line' | 'facebook' | 'tiktok' | 'youtube' | 'instagram' | 'generic';

const kindOf = (label: string): SocialKind => {
  const value = label.toLowerCase();
  if (value.includes('line')) return 'line';
  if (value.includes('facebook') || value === 'fb') return 'facebook';
  if (value.includes('tiktok') || value.includes('tik tok')) return 'tiktok';
  if (value.includes('youtube') || value === 'yt') return 'youtube';
  if (value.includes('instagram') || value === 'ig') return 'instagram';
  return 'generic';
};

const SOCIAL_STYLE: Record<SocialKind, { color: string; glyph: string }> = {
  line: { color: socialColors.line, glyph: 'LINE' },
  facebook: { color: socialColors.facebook, glyph: 'f' },
  tiktok: { color: socialColors.tiktok, glyph: '♪' },
  youtube: { color: socialColors.youtube, glyph: '▶' },
  instagram: { color: socialColors.instagram, glyph: '◎' },
  generic: { color: socialColors.generic, glyph: '•' },
};

export const SiteFooter = ({
  site,
  menus,
  blocks = [],
  languages,
  shopProducts,
  locale,
}: SiteFooterProps) => {
  const language = locale ?? languages?.find((link) => link.active)?.locale ?? site.localeDefault;
  const t = storefrontT(language);
  const social = socialLinks(site);
  const legal = legalLinks(site);
  const background = footerBackground(site);
  const photo = footerBackgroundImage(site);

  return (
    <footer
      className="site-footer"
      data-background={background === 'none' ? undefined : background}
      style={{ '--footer-overlay': String(footerOverlay(site)) } as CSSProperties}
    >
      {photo ? (
        <div className="site-footer__bg" aria-hidden="true">
          <img src={photo} alt="" loading="lazy" decoding="async" />
        </div>
      ) : null}

      <div className="site-footer__top">
        <div className="site-footer__brand">
          {site.logoUrl ? (
            <img className="site-footer__logo" src={site.logoUrl} alt={site.name} />
          ) : null}
          {blocks.length > 0 ? (
            <div className="site-footer__blocks">
              <BlockTreeRenderer
                blocks={blocks}
                locale={language}
                {...(languages ? { languages } : {})}
                {...(shopProducts ? { shopProducts } : {})}
              />
            </div>
          ) : (
            <p className="site-footer__name">{site.name}</p>
          )}
        </div>

        {menus.footer.length > 0 ? (
          <nav
            className={`site-nav site-nav--footer site-nav--align-${menuAlignFromSettings(site.settings, 'footer')}`}
            aria-label={t('footer.menu')}
          >
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

        {social.length > 0 ? (
          <div className="site-footer__social">
            <p className="site-footer__social-title">Follow Us</p>
            <ul className="site-footer__social-list">
              {social.map((link) => {
                const kind = kindOf(link.label);
                const style = SOCIAL_STYLE[kind];
                return (
                  <li key={link.href}>
                    <a
                      className="site-footer__social-link"
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.label}
                      title={link.label}
                      data-kind={kind}
                      style={{ backgroundColor: style.color }}
                    >
                      <span aria-hidden="true">{style.glyph}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="site-footer__bottom">
        <p className="site-footer__copyright">{footerCopyright(site)}</p>
        {legal.length > 0 ? (
          <nav className="site-footer__legal" aria-label={t('footer.legal')}>
            <ul className="site-footer__legal-list">
              {legal.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <a className="site-footer__legal-link" href={link.href}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>

      <a
        className="site-back-to-top"
        href="#"
        aria-label={t('footer.backToTop')}
        title={t('footer.backToTop')}
      >
        <Icon name="arrow-up" size={22} />
      </a>
    </footer>
  );
};

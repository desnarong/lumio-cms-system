import type { PublicSite } from '@lumio/shared';

/**
 * Site-chrome options the owner sets in the Design Panel. They live in
 * `sites.settings` (JSON) so every page reads them from the same payload the
 * renderer already receives, with no extra request.
 */

export interface HeaderActions {
  language: boolean;
  account: boolean;
  cart: boolean;
}

export type SocialLink = { label: string; href: string };

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const chrome = (site: PublicSite): Record<string, unknown> =>
  asRecord(asRecord(site.settings).chrome);

export const headerActions = (site: PublicSite): HeaderActions => {
  const raw = asRecord(asRecord(site.settings).headerActions);
  return {
    language: raw.language === true,
    account: raw.account === true,
    cart: raw.cart === true,
  };
};

const chromeLinks = (value: unknown): SocialLink[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const entry = asRecord(item);
    const label = typeof entry.label === 'string' ? entry.label.trim() : '';
    const href = typeof entry.href === 'string' ? entry.href.trim() : '';
    return label.length > 0 && /^(https?:\/\/|\/)/i.test(href) ? [{ label, href }] : [];
  });
};

/** Social links, newest location first and the older top-level key as fallback. */
export const socialLinks = (site: PublicSite): SocialLink[] => {
  const fromChrome = chromeLinks(chrome(site).socialLinks);
  return fromChrome.length > 0 ? fromChrome : chromeLinks(asRecord(site.settings).socialLinks);
};

export const legalLinks = (site: PublicSite): SocialLink[] => chromeLinks(chrome(site).legalLinks);

const FOOTER_BACKGROUNDS = ['none', 'surface', 'muted', 'brand'] as const;
export type FooterBackground = (typeof FOOTER_BACKGROUNDS)[number];

/** Pixel height the Design Panel set, or `null` to fit the header content. */
export const headerHeight = (site: PublicSite): number | null => {
  const raw = chrome(site).headerHeight;
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= 56 && raw <= 200
    ? Math.round(raw)
    : null;
};

/** Logo height in pixels, or `null` for the template default. */
export const logoHeight = (site: PublicSite): number | null => {
  const raw = chrome(site).logoHeight;
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= 16 && raw <= 160
    ? Math.round(raw)
    : null;
};

export const footerBackground = (site: PublicSite): FooterBackground => {
  const value = chrome(site).footerBackground ?? asRecord(site.settings).footerBackground;
  return typeof value === 'string' && (FOOTER_BACKGROUNDS as readonly string[]).includes(value)
    ? (value as FooterBackground)
    : 'none';
};

/** Absolute URL of the footer photo, or `null` when the band stays plain. */
export const footerBackgroundImage = (site: PublicSite): string | null => {
  const value = chrome(site).footerBackgroundImage;
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim()) ? value.trim() : null;
};

/** Dark tint over the footer photo, 0-1. */
export const footerOverlay = (site: PublicSite): number => {
  const raw = chrome(site).footerOverlay;
  return typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 && raw <= 100
    ? raw / 100
    : 0.6;
};

export const footerCopyright = (site: PublicSite): string => {
  const raw = chrome(site).copyright;
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();
  return `© ${new Date().getFullYear()} ${site.name} All rights reserved.`;
};

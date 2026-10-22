import type { LanguageLink } from '@lumio/blocks/render';
import { localeLabel, type PublicPage } from '@lumio/shared';

/**
 * Turns the page's language list into what the language-switcher block renders
 * (docs/design/17-i18n.md 17.3). Labels come from the shared locale names so the
 * switcher always reads "ไทย / English", never a raw code.
 */
export const languageLinks = (page: PublicPage): LanguageLink[] =>
  page.translations.map((entry) => ({
    locale: entry.locale,
    label: localeLabel(entry.locale),
    href: entry.path,
    active: entry.locale === page.locale,
    available: entry.available,
  }));
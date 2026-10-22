import type { CSSProperties } from 'react';
import { normalizeThemeTokens, themeCssVariables, themeDataAttributes } from '@lumio/shared';

export interface SiteTheme {
  /** CSS variables the block stylesheet reads (colors, fonts, corners, density). */
  style: CSSProperties;
  /** Attribute hooks: button style, density, and dark mode for `colorMode`. */
  attributes: Record<string, string>;
}

/**
 * Turns a site's `theme_tokens` into the inline CSS variables and data attributes
 * on the site wrapper. Blocks only ever read tokens, so switching template or
 * brand colour never requires hard-coded values in a component
 * (docs/design/06-design-system.md, 08-theme-design-panel.md 8.1).
 */
export const siteTheme = (themeTokens: Record<string, unknown>): SiteTheme => {
  const tokens = normalizeThemeTokens(themeTokens);

  return {
    style: themeCssVariables(themeTokens) as CSSProperties,
    attributes: {
      ...themeDataAttributes(themeTokens),
      // `colorMode: "dark"` pins the site; "auto" follows the visitor through
      // the `[data-color-mode="auto"]` rule in theme.css.
      ...(tokens.colorMode === 'dark' ? { 'data-theme': 'dark' } : {}),
    },
  };
};

/**
 * Locale URLs of the public site (docs/design/17-i18n.md 17.1). The default
 * language is served prefix-free; every other language lives under `/{locale}`.
 * The middleware rewrites the prefixed form back to the plain route and passes the
 * language to the page through a request header, so one set of routes serves all
 * languages. The prefix list mirrors `SUPPORTED_LOCALES` in `@lumio/shared`.
 */
export const LOCALE_PREFIXES = ['en', 'th'] as const;

export const DEFAULT_LOCALE = 'th';

export interface LocalePath {
  locale: string;
  /** Path without the locale prefix, always starting with `/`. */
  path: string;
  /** True when the incoming path carried a locale segment. */
  hasPrefix: boolean;
}

/**
 * Splits `/{locale}/...` off an incoming path. This mirrors `splitLocalePath` in
 * `@lumio/shared` (where it is covered by tests) but is kept local so the edge
 * middleware does not pull the shared package, and its Zod schemas, into its bundle.
 */
export const splitLocalePath = (
  pathname: string,
  locales: readonly string[] = LOCALE_PREFIXES,
  defaultLocale: string = DEFAULT_LOCALE,
): LocalePath => {
  const clean = pathname.split('?')[0] ?? pathname;
  const segments = clean.split('/').filter((segment) => segment.length > 0);
  const [first, ...rest] = segments;

  if (first && locales.includes(first)) {
    return {
      locale: first,
      path: rest.length > 0 ? `/${rest.join('/')}` : '/',
      hasPrefix: true,
    };
  }
  return {
    locale: defaultLocale,
    path: clean.startsWith('/') ? clean : `/${clean}`,
    hasPrefix: false,
  };
};
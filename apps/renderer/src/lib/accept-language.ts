/**
 * Language negotiation for the public middleware (docs/design/17-i18n.md 17.1).
 *
 * The parsing and matching mirror `parseAcceptLanguage` / `negotiateLocale` in
 * `@lumio/shared` (where they are covered by tests) but stay local: the edge
 * middleware must not pull the shared package, and its Zod schemas, into its
 * bundle. Only the pure decision lives here, so it can be tested without a
 * running server.
 */

export interface AcceptedLanguage {
  tag: string;
  quality: number;
}

/** Parses `Accept-Language`; malformed entries are skipped, never thrown on. */
export const parseAcceptLanguage = (header: string | null | undefined): AcceptedLanguage[] => {
  if (typeof header !== 'string' || header.trim().length === 0) return [];

  const parsed: AcceptedLanguage[] = [];
  for (const part of header.split(',')) {
    const [rawTag, ...params] = part.split(';');
    const tag = (rawTag ?? '').trim().toLowerCase();
    if (tag.length === 0) continue;

    let quality = 1;
    for (const param of params) {
      const [name, value] = param.split('=');
      if (name?.trim().toLowerCase() === 'q') {
        const parsedQuality = Number((value ?? '').trim());
        quality = Number.isFinite(parsedQuality) ? Math.min(1, Math.max(0, parsedQuality)) : 0;
      }
    }
    parsed.push({ tag, quality });
  }

  return parsed
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => b.entry.quality - a.entry.quality || a.index - b.index)
    .map(({ entry }) => entry);
};

/** Best language the site offers for this visitor, or the default language. */
export const negotiateLocale = (
  acceptLanguage: string | null | undefined,
  offered: readonly string[],
  defaultLocale: string,
): string => {
  const languages = offered.length > 0 ? offered : [defaultLocale];
  const accepted = parseAcceptLanguage(acceptLanguage).filter((entry) => entry.quality > 0);
  if (accepted.length === 0) return defaultLocale;

  for (const { tag } of accepted) {
    if (tag === '*') return defaultLocale;

    const exact = languages.find((locale) => locale === tag);
    if (exact) return exact;

    const primary = tag.split('-')[0] ?? '';
    const partial = languages.find((locale) => locale.split('-')[0] === primary);
    if (partial) return partial;
  }
  return defaultLocale;
};

export interface LocaleRoutingInput {
  /** Path without any locale prefix, always starting with `/`. */
  path: string;
  /** Query string, `''` or starting with `?`. */
  search: string;
  /** True when the URL already carried a locale prefix. */
  hasPrefix: boolean;
  /** Language the prefix named; ignored when `hasPrefix` is false. */
  pathLocale: string;
  /** Language the visitor's browser asks for. */
  acceptLanguage: string | null;
  /** Languages the site offers, as the API reports them. */
  offered: readonly string[];
  defaultLocale: string;
  /** Language taken from a subdomain such as `en.baandoi.example.com`. */
  localeFromHost: string | null;
  /**
   * Only real navigations are negotiated: prefetches, assets and non-GET
   * requests must never be redirected, or Next would fetch the wrong page.
   */
  isNavigation: boolean;
}

export interface LocaleRouting {
  /** Language the request is served in. */
  locale: string;
  /** Where to send the visitor before rendering, or null to serve `path`. */
  redirectTo: string | null;
}

/**
 * Decides two things for one request: which language to serve, and whether the
 * visitor should be sent to a different URL first.
 *
 * A subdomain (`en.site.com`) and an explicit `/{locale}` prefix are both
 * deliberate choices, so they win over the browser's `Accept-Language`. Only a
 * plain path negotiates, and only towards a language the site really offers;
 * the redirect is temporary (307) because it depends on the visitor's headers,
 * while the prefixed URL stays canonical.
 */
export const decideLocale = (input: LocaleRoutingInput): LocaleRouting => {
  const { path, search, hasPrefix, offered, defaultLocale, localeFromHost } = input;

  if (hasPrefix) return { locale: input.pathLocale, redirectTo: null };
  if (localeFromHost) return { locale: localeFromHost, redirectTo: null };
  if (!input.isNavigation) return { locale: defaultLocale, redirectTo: null };

  const negotiated = negotiateLocale(input.acceptLanguage, offered, defaultLocale);
  if (negotiated === defaultLocale) return { locale: defaultLocale, redirectTo: null };

  const prefix = path === '/' ? '' : path;
  return { locale: negotiated, redirectTo: `/${negotiated}${prefix}${search}` };
};

/** True for a plain HTML navigation, i.e. the only kind worth redirecting. */
export const isNavigationRequest = (input: {
  method: string;
  accept?: string | null;
  purpose?: string | null;
  nextPrefetch?: string | null;
}): boolean => {
  if (input.method.toUpperCase() !== 'GET') return false;
  if (input.purpose?.toLowerCase() === 'prefetch') return false;
  if (typeof input.nextPrefetch === 'string' && input.nextPrefetch.length > 0) return false;

  const accept = input.accept ?? '';
  // A missing Accept header means a plain client; anything that only asks for
  // data (JSON, images, the sitemap) is left alone.
  return accept.length === 0 || accept.includes('text/html') || accept.includes('*/*');
};
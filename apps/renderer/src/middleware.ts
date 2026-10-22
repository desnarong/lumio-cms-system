import { NextResponse, type NextRequest } from 'next/server';
import { decideLocale, isNavigationRequest } from './lib/accept-language';
import { buildContentSecurityPolicy } from './lib/csp';
import { DEFAULT_LOCALE, LOCALE_PREFIXES, splitLocalePath } from './lib/locale';
import { LOCALE_HEADER } from './lib/request-locale';
import { loadSiteLocales } from './lib/site-locales';

/** Host header without the port; `localhost:49200` → `localhost`. */
const hostOf = (request: NextRequest): string => {
  const forwarded = request.headers.get('x-forwarded-host');
  const raw = forwarded ?? request.headers.get('host') ?? '';
  const first = raw.split(',')[0]?.trim() ?? '';
  const withoutPort = first.startsWith('[')
    ? first.slice(0, first.indexOf(']') + 1)
    : (first.split(':')[0] ?? '');
  return withoutPort.toLowerCase();
};

/**
 * Prepares every public page (docs/design/15-security.md 15.2, 17-i18n.md 17.1):
 *
 * 1. Reads the language from the URL. `/en/about` is rewritten to the plain
 *    `/about` route with the language in a request header, so one set of routes
 *    serves every language; `/th/about` (the default language) is canonicalised
 *    to `/about` with a permanent redirect.
 * 2. Honours the visitor's `Accept-Language` for a plain path, but only towards
 *    a language the site really offers and only on a real navigation
 *    (docs/design/17-i18n.md 17.4).
 * 3. Reads a language subdomain such as `en.baandoi.lumio.app`.
 * 4. Adds a per-request CSP with a nonce. Next.js reads the request's
 *    `content-security-policy` header and stamps the nonce onto its own scripts.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;
  const { locale, path, hasPrefix } = splitLocalePath(pathname, LOCALE_PREFIXES, DEFAULT_LOCALE);

  // The default language has no prefix; sending a visitor to the canonical URL
  // keeps one address per page (docs/design/17-i18n.md 17.4 rule 5).
  if (hasPrefix && locale === DEFAULT_LOCALE) {
    return NextResponse.redirect(new URL(`${path}${search}`, request.nextUrl.origin), 308);
  }

  const host = hostOf(request);
  const siteLocales = hasPrefix ? null : await loadSiteLocales(host);

  const routing = decideLocale({
    path,
    search,
    hasPrefix,
    pathLocale: locale,
    acceptLanguage: request.headers.get('accept-language'),
    offered: siteLocales?.locales ?? LOCALE_PREFIXES,
    defaultLocale: siteLocales?.defaultLocale ?? DEFAULT_LOCALE,
    localeFromHost: siteLocales?.localeFromHost ?? null,
    isNavigation: isNavigationRequest({
      method: request.method,
      accept: request.headers.get('accept'),
      purpose: request.headers.get('purpose') ?? request.headers.get('sec-purpose'),
      nextPrefetch: request.headers.get('next-router-prefetch'),
    }),
  });

  if (routing.redirectTo) {
    return NextResponse.redirect(new URL(routing.redirectTo, request.nextUrl.origin), 307);
  }

  const nonce = btoa(crypto.randomUUID());
  const contentSecurityPolicy = buildContentSecurityPolicy({
    nonce,
    dev: process.env.NODE_ENV !== 'production',
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', contentSecurityPolicy);
  requestHeaders.set(LOCALE_HEADER, hasPrefix ? locale : routing.locale);

  const response = hasPrefix
    ? NextResponse.rewrite(new URL(`${path}${search}`, request.nextUrl.origin), {
        request: { headers: requestHeaders },
      })
    : NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set('content-security-policy', contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
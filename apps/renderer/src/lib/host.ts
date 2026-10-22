/**
 * Which site a request belongs to. Behind a CDN the real host arrives in
 * `x-forwarded-host`, so that wins over `Host`; everything else is the raw
 * header, because the public API resolves the tenant from it.
 */
export const resolveRequestHost = (
  forwardedHost: string | null | undefined,
  host: string | null | undefined,
  fallback = 'localhost:49200',
): string => {
  const raw = (forwardedHost ?? host ?? '').split(',')[0]?.trim() ?? '';
  return raw.length > 0 ? raw : fallback;
};

/** Canonical origin of a site, used for canonical links and the sitemap. */
export const siteOrigin = (host: string): string => {
  const hostname = host.split(':')[0] ?? host;
  const scheme = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' ? 'http' : 'https';
  return `${scheme}://${host}`;
};

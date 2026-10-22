/**
 * Site languages for the public middleware (docs/design/17-i18n.md 17.1).
 *
 * The middleware has to know which languages a host offers before it may honour
 * a visitor's `Accept-Language`; otherwise an English-preferring visitor would
 * be redirected to an English URL of a Thai-only site. The answer comes from the
 * public API and is cached in this process for a few minutes, so a busy site
 * pays for one request per host per instance.
 */

export interface SiteLocales {
  locales: string[];
  defaultLocale: string;
  localeFromHost: string | null;
}

/** Cache lifetime: long enough to skip work, short enough to notice a change. */
export const LOCALES_CACHE_TTL_MS = 300_000;

const cache = new Map<string, { at: number; value: SiteLocales }>();

export const apiBaseUrl = (): string =>
  (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

/** Clears the cache; used by tests and by the revalidate route. */
export const clearSiteLocalesCache = (): void => {
  cache.clear();
};

/**
 * Languages of a host, or null when the API is unreachable or has never heard
 * of it. `null` means "do not negotiate", which keeps a broken API from sending
 * visitors to URLs that do not exist.
 */
export const loadSiteLocales = async (
  host: string,
  options: { now?: () => number; fetcher?: typeof fetch } = {},
): Promise<SiteLocales | null> => {
  const now = options.now ?? (() => Date.now());
  const fetcher = options.fetcher ?? fetch;
  const key = host.toLowerCase();

  const cached = cache.get(key);
  if (cached && now() - cached.at < LOCALES_CACHE_TTL_MS) return cached.value;

  const base = apiBaseUrl();
  if (base.length === 0) return null;

  try {
    const response = await fetcher(
      `${base}/api/v1/public/${encodeURIComponent(key)}/locales`,
      { headers: { accept: 'application/json' } },
    );
    if (!response.ok) return null;

    const payload = (await response.json()) as { data?: Partial<SiteLocales> };
    const data = payload.data;
    if (!data || !Array.isArray(data.locales) || data.locales.length === 0) return null;

    const value: SiteLocales = {
      locales: data.locales.filter((locale): locale is string => typeof locale === 'string'),
      defaultLocale: typeof data.defaultLocale === 'string' ? data.defaultLocale : 'th',
      localeFromHost: typeof data.localeFromHost === 'string' ? data.localeFromHost : null,
    };
    cache.set(key, { at: now(), value });
    return value;
  } catch {
    return null;
  }
};
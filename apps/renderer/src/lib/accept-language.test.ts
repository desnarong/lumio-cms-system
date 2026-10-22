import { describe, expect, it, vi } from 'vitest';
import {
  decideLocale,
  isNavigationRequest,
  negotiateLocale,
  parseAcceptLanguage,
} from './accept-language';
import { clearSiteLocalesCache, loadSiteLocales } from './site-locales';

describe('parseAcceptLanguage', () => {
  it('orders tags by quality and keeps ties in client order', () => {
    expect(parseAcceptLanguage('en;q=0.8, th;q=0.9, fr')).toEqual([
      { tag: 'fr', quality: 1 },
      { tag: 'th', quality: 0.9 },
      { tag: 'en', quality: 0.8 },
    ]);
    expect(parseAcceptLanguage('en, th').map((entry) => entry.tag)).toEqual(['en', 'th']);
  });

  it('survives an empty or broken header', () => {
    expect(parseAcceptLanguage(null)).toEqual([]);
    expect(parseAcceptLanguage(',en,;,')).toEqual([{ tag: 'en', quality: 1 }]);
  });
});

describe('negotiateLocale', () => {
  it('picks the most preferred language the site offers', () => {
    expect(negotiateLocale('en-GB,en;q=0.9,th;q=0.5', ['th', 'en'], 'th')).toBe('en');
    expect(negotiateLocale('pt-br', ['th', 'en', 'pt'], 'th')).toBe('pt');
  });

  it('falls back to the default language', () => {
    expect(negotiateLocale('de,fr;q=0.9', ['th', 'en'], 'th')).toBe('th');
    expect(negotiateLocale('en;q=0', ['th', 'en'], 'th')).toBe('th');
    expect(negotiateLocale('', ['th', 'en'], 'th')).toBe('th');
  });
});

describe('isNavigationRequest', () => {
  it('accepts a plain HTML GET', () => {
    expect(isNavigationRequest({ method: 'GET', accept: 'text/html,application/xhtml+xml' })).toBe(
      true,
    );
    expect(isNavigationRequest({ method: 'GET', accept: null })).toBe(true);
  });

  it('refuses prefetches, non-GET requests and data-only requests', () => {
    expect(isNavigationRequest({ method: 'GET', accept: 'text/html', purpose: 'prefetch' })).toBe(
      false,
    );
    expect(
      isNavigationRequest({ method: 'GET', accept: 'text/html', nextPrefetch: '1' }),
    ).toBe(false);
    expect(isNavigationRequest({ method: 'POST', accept: 'text/html' })).toBe(false);
    expect(isNavigationRequest({ method: 'GET', accept: 'application/json' })).toBe(false);
  });
});

describe('decideLocale', () => {
  const base = {
    path: '/about',
    search: '',
    hasPrefix: false,
    pathLocale: 'th',
    acceptLanguage: 'en-GB,en;q=0.9',
    offered: ['th', 'en'],
    defaultLocale: 'th',
    localeFromHost: null,
    isNavigation: true,
  };

  it('keeps the default language for a visitor who prefers it', () => {
    expect(decideLocale({ ...base, acceptLanguage: 'th-TH,th;q=0.9' })).toEqual({
      locale: 'th',
      redirectTo: null,
    });
  });

  it('sends an English-preferring visitor to the prefixed URL once', () => {
    expect(decideLocale(base)).toEqual({ locale: 'en', redirectTo: '/en/about' });
    expect(decideLocale({ ...base, path: '/', search: '?utm=1' })).toEqual({
      locale: 'en',
      redirectTo: '/en?utm=1',
    });
  });

  it('never negotiates away an explicit prefix or subdomain', () => {
    expect(decideLocale({ ...base, hasPrefix: true, pathLocale: 'en' })).toEqual({
      locale: 'en',
      redirectTo: null,
    });
    expect(decideLocale({ ...base, localeFromHost: 'en' })).toEqual({
      locale: 'en',
      redirectTo: null,
    });
  });

  it('does not redirect a language the site does not offer', () => {
    expect(decideLocale({ ...base, offered: ['th'], acceptLanguage: 'en' })).toEqual({
      locale: 'th',
      redirectTo: null,
    });
    expect(decideLocale({ ...base, acceptLanguage: 'de' })).toEqual({
      locale: 'th',
      redirectTo: null,
    });
  });

  it('leaves prefetches and data requests alone', () => {
    expect(decideLocale({ ...base, isNavigation: false })).toEqual({
      locale: 'th',
      redirectTo: null,
    });
  });
});

describe('loadSiteLocales', () => {
  const jsonResponse = (data: unknown, ok = true): Response =>
    ({ ok, json: async () => ({ data }) }) as unknown as Response;

  it('caches the answer per host and asks the public endpoint once', async () => {
    clearSiteLocalesCache();
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({ locales: ['th', 'en'], defaultLocale: 'th', localeFromHost: null }),
    );

    const first = await loadSiteLocales('baandoi.lumio.app', { fetcher });
    const second = await loadSiteLocales('baandoi.lumio.app', { fetcher });

    expect(first).toEqual({ locales: ['th', 'en'], defaultLocale: 'th', localeFromHost: null });
    expect(second).toEqual(first);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0]?.[0])).toContain('/api/v1/public/baandoi.lumio.app/locales');
  });

  it('refreshes after the cache lifetime', async () => {
    clearSiteLocalesCache();
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ locales: ['th'], defaultLocale: 'th' }));
    let now = 0;

    await loadSiteLocales('baandoi.lumio.app', { fetcher, now: () => now });
    now += 400_000;
    await loadSiteLocales('baandoi.lumio.app', { fetcher, now: () => now });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('reports null rather than guessing when the API cannot answer', async () => {
    clearSiteLocalesCache();
    const failing = vi.fn().mockRejectedValue(new Error('offline'));
    const notFound = vi.fn().mockResolvedValue(jsonResponse(undefined, false));
    const empty = vi.fn().mockResolvedValue(jsonResponse({ locales: [] }));

    expect(await loadSiteLocales('unknown.example.com', { fetcher: failing })).toBeNull();
    expect(await loadSiteLocales('unknown.example.com', { fetcher: notFound })).toBeNull();
    expect(await loadSiteLocales('unknown.example.com', { fetcher: empty })).toBeNull();
  });

  it('passes the language subdomain through to the caller', async () => {
    clearSiteLocalesCache();
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse({ locales: ['th', 'en'], defaultLocale: 'th', localeFromHost: 'en' }));

    const locales = await loadSiteLocales('en.baandoi.lumio.app', { fetcher });

    expect(locales?.localeFromHost).toBe('en');
  });
});
import type {
  PageviewInput,
  PublicPage,
  PublicPostList,
  PublicSitemap,
  SubmitFormInput,
} from '@lumio/shared';
import {
  ApiUnavailableError,
  ContentNotFoundError,
  createPublicApi,
  type PublicApi,
} from './api';
import { createDemoPublicApi } from './demo';
import { unstable_cache } from 'next/cache';

/**
 * Which API the renderer talks to. With `NEXT_PUBLIC_API_URL` set it uses the
 * real `/public` endpoints; otherwise it serves the built-in demo site, so the
 * renderer runs on its own during development.
 */
export const getPublicApi = (): PublicApi => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  return baseUrl && baseUrl.length > 0 ? createPublicApi({ baseUrl }) : createDemoPublicApi();
};

/** Serving demo content in production would be worse than a 500. */
const fallbackAllowed = (): boolean => process.env.NODE_ENV !== 'production';

const withFallback = async <T>(load: (api: PublicApi) => Promise<T>): Promise<T> => {
  try {
    return await load(getPublicApi());
  } catch (error) {
    if (error instanceof ApiUnavailableError && fallbackAllowed()) {
      return load(createDemoPublicApi());
    }
    throw error;
  }
};

/**
 * Per-host data cache (docs/design/10-architecture.md 10.4 step 1). The routes
 * stay request-scoped because the host comes from the `Host` header, so the
 * caching happens one layer down: each host gets its own cache entry and its
 * own tag, which the publish pipeline invalidates via `/api/revalidate`.
 */
const cacheSeconds = (): number => {
  const raw = Number(process.env.RENDERER_CACHE_SECONDS ?? '3600');
  return Number.isFinite(raw) && raw >= 0 ? raw : 3600;
};

const cacheFor = <T>(host: string, key: string, load: () => Promise<T>): Promise<T> => {
  if (process.env.NODE_ENV === 'test') return load();
  return unstable_cache(load, ['renderer', key, host], {
    revalidate: cacheSeconds(),
    tags: [`site:${host}`],
  })();
};

export const loadPage = (host: string, slug: string, locale?: string): Promise<PublicPage> =>
  cacheFor(host, `page:${slug}:${locale ?? ''}`, () =>
    withFallback((api) => api.getPage(host, slug, locale)),
  );

export const loadPost = (host: string, slug: string, locale?: string): Promise<PublicPage> =>
  cacheFor(host, `post:${slug}:${locale ?? ''}`, () =>
    withFallback((api) => api.getPost(host, slug, locale)),
  );

export const loadPosts = (host: string, locale?: string): Promise<PublicPostList> =>
  cacheFor(host, `posts:${locale ?? ''}`, () =>
    withFallback((api) => api.listPosts(host, locale)),
  );

export const loadSitemap = (host: string): Promise<PublicSitemap> =>
  cacheFor(host, 'sitemap', () => withFallback((api) => api.getSitemap(host)));

/**
 * Contact-form submission. It never falls back to demo data: a message that only
 * existed in the visitor's browser would be worse than an honest error.
 */
export const submitForm = (
  host: string,
  formId: string,
  input: SubmitFormInput,
): Promise<{ ok: boolean }> => getPublicApi().submitForm(host, formId, input);

/**
 * Records one page view for the host's site. A dropped beacon is not worth an
 * error on a public page, so failures are swallowed here.
 */
export const collectPageview = async (host: string, input: PageviewInput): Promise<void> => {
  try {
    await getPublicApi().collectPageview(host, input);
  } catch {
    // Ignore: analytics must never break the visitor's page.
  }
};

/** Same as {@link loadPage}, but `null` means "no such page" instead of throwing. */
export const loadPageOrNull = async (
  host: string,
  slug: string,
  locale?: string,
): Promise<PublicPage | null> => {
  try {
    return await loadPage(host, slug, locale);
  } catch (error) {
    if (error instanceof ContentNotFoundError) return null;
    throw error;
  }
};

export const loadPostOrNull = async (
  host: string,
  slug: string,
  locale?: string,
): Promise<PublicPage | null> => {
  try {
    return await loadPost(host, slug, locale);
  } catch (error) {
    if (error instanceof ContentNotFoundError) return null;
    throw error;
  }
};

/**
 * Draft preview by signed token (docs/design/10-architecture.md 10.4). It never
 * falls back to demo content: showing the wrong page would be worse than an
 * honest "ลิงก์หมดอายุ" screen. The API sends `no-store`, so nothing is cached.
 */
export const loadPreview = (token: string): Promise<PublicPage> =>
  getPublicApi().getPreview(token);

export const loadPreviewOrNull = async (token: string): Promise<PublicPage | null> => {
  try {
    return await loadPreview(token);
  } catch (error) {
    if (error instanceof ContentNotFoundError) return null;
    throw error;
  }
};

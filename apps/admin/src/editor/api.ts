import type {
  ContentDetail,
  ContentListQuery,
  ContentSummary,
  ContentTranslations,
  ContentVersionDetail,
  ContentVersionSummary,
  CreateContentInput,
  CreateContentVersionInput,
  CreateTranslationInput,
  SaveContentBlocksInput,
  SaveContentBlocksResult,
  SeoPatch,
  TranslateContentInput,
  TranslateContentResult,
  UpdateContentInput,
} from '@lumio/shared';
import { translateNow } from '@lumio/ui';
import { ApiError } from '../api-error.js';

export { ApiError } from '../api-error.js';

export interface PublishContentResult {
  revision: number;
  publishedAt: string;
}

/** Draft preview link: a signed URL that only shows this page, never indexed. */
export interface PreviewLink {
  url: string;
  expiresAt: string;
}

/** One page of a list, with the cursor the API returned. */
export interface ContentPage {
  items: ContentSummary[];
  cursor: string | null;
}

/** Everything the editor needs from the API, so tests can swap in a fake. */
export interface ContentApi {
  /** Pages of the site, so the shell can open the home page after sign-in. */
  listPages(): Promise<ContentSummary[]>;
  /** Content list screen: filter by kind/status/search (05-admin-ia.md 5.4). */
  list(query: Partial<ContentListQuery>): Promise<ContentPage>;
  create(input: CreateContentInput): Promise<ContentSummary>;
  update(contentId: string, input: UpdateContentInput): Promise<ContentSummary>;
  remove(contentId: string): Promise<void>;
  getContent(contentId: string): Promise<ContentDetail>;
  saveBlocks(contentId: string, input: SaveContentBlocksInput): Promise<SaveContentBlocksResult>;
  publish(contentId: string): Promise<PublishContentResult>;
  /** Short-lived link that renders the draft on the public site (design 10.4). */
  createPreviewLink(contentId: string): Promise<PreviewLink>;
  /** Version history: list, preview one, save a named checkpoint, restore. */
  listVersions(contentId: string): Promise<ContentVersionSummary[]>;
  getVersion(contentId: string, versionId: string): Promise<ContentVersionDetail>;
  createVersion(
    contentId: string,
    input: CreateContentVersionInput,
  ): Promise<ContentVersionSummary>;
  restoreVersion(contentId: string, versionId: string): Promise<SaveContentBlocksResult>;
  /** Brings a page back from the trash as a draft. */
  restore(contentId: string): Promise<ContentDetail>;
  /** Every language of one page (docs/design/17-i18n.md 17.3). */
  translations(contentId: string): Promise<ContentTranslations>;
  /** Creates this page in another language, optionally translating its copy. */
  createTranslation(contentId: string, input: CreateTranslationInput): Promise<ContentDetail>;
  /** Finishes translating this page's own copy into its language (17-i18n.md 17.4). */
  translateContent(contentId: string, input: TranslateContentInput): Promise<TranslateContentResult>;
  /** Writes only the meta text sent, keeping the rest of the page's SEO settings. */
  updateSeo(contentId: string, input: SeoPatch): Promise<ContentDetail>;
}

interface Envelope<T> {
  data: T;
  meta?: { cursor?: string | null };
}

interface ErrorEnvelope {
  error?: string;
  message?: string;
}

export interface HttpContentApiConfig {
  /** API origin, e.g. `http://localhost:49200`. Empty string keeps requests same-origin. */
  baseUrl: string;
  getAccessToken?: () => string | null;
  getSiteId?: () => string | null;
  fetchImpl?: typeof fetch;
}

const queryString = (query: Partial<ContentListQuery>): string => {
  const params = new URLSearchParams();
  if (query.type) params.set('type', query.type);
  if (query.status) params.set('status', query.status);
  if (query.q) params.set('q', query.q);
  if (query.locale) params.set('locale', query.locale);
  if (query.cursor) params.set('cursor', query.cursor);
  params.set('limit', String(query.limit ?? 20));
  return params.toString();
};

/**
 * Talks to `/api/v1/contents`. The site is always sent as `X-Site-Id`, because
 * `/contents/:contentId` uses its path parameter for the page, not the site.
 */
export const createHttpContentApi = ({
  baseUrl,
  getAccessToken,
  getSiteId,
  fetchImpl,
}: HttpContentApiConfig): ContentApi => {
  const doFetch = fetchImpl ?? globalThis.fetch.bind(globalThis);

  const send = async (path: string, init: RequestInit = {}): Promise<Envelope<unknown>> => {
    const token = getAccessToken?.() ?? null;
    const siteId = getSiteId?.() ?? null;

    const response = await doFetch(`${baseUrl}/api/v1${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(siteId ? { 'x-site-id': siteId } : {}),
        ...(init.headers ?? {}),
      },
    });

    const payload = (await response.json().catch(() => null)) as
      | Envelope<unknown>
      | ErrorEnvelope
      | null;

    if (!response.ok) {
      const error = payload as ErrorEnvelope | null;
      throw new ApiError(
        error?.error ?? 'internal_error',
        error?.message ?? translateNow('api.networkError'),
        response.status,
      );
    }

    return payload as Envelope<unknown>;
  };

  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> =>
    (await send(path, init)).data as T;

  return {
    listPages: () => request<ContentSummary[]>('/contents?type=page&limit=50'),
    list: async (query) => {
      const payload = await send(`/contents?${queryString(query)}`);
      return {
        items: (payload.data ?? []) as ContentSummary[],
        cursor: payload.meta?.cursor ?? null,
      };
    },
    create: (input) =>
      request<ContentSummary>('/contents', { method: 'POST', body: JSON.stringify(input) }),
    update: (contentId, input) =>
      request<ContentSummary>(`/contents/${contentId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    remove: async (contentId) => {
      await request<{ success: boolean }>(`/contents/${contentId}`, { method: 'DELETE' });
    },
    getContent: (contentId) => request<ContentDetail>(`/contents/${contentId}`),
    saveBlocks: (contentId, input) =>
      request<SaveContentBlocksResult>(`/contents/${contentId}/blocks`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    publish: (contentId) =>
      request<PublishContentResult>(`/contents/${contentId}/publish`, { method: 'POST' }),
    createPreviewLink: (contentId) =>
      request<PreviewLink>(`/contents/${contentId}/preview-link`, { method: 'POST' }),
    listVersions: (contentId) =>
      request<ContentVersionSummary[]>(`/contents/${contentId}/versions`),
    getVersion: (contentId, versionId) =>
      request<ContentVersionDetail>(`/contents/${contentId}/versions/${versionId}`),
    createVersion: (contentId, input) =>
      request<ContentVersionSummary>(`/contents/${contentId}/versions`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    restoreVersion: (contentId, versionId) =>
      request<SaveContentBlocksResult>(`/contents/${contentId}/restore/${versionId}`, {
        method: 'POST',
      }),
    restore: (contentId) =>
      request<ContentDetail>(`/contents/${contentId}/restore`, { method: 'POST' }),
    translations: (contentId) =>
      request<ContentTranslations>(`/contents/${contentId}/translations`),
    createTranslation: (contentId, input) =>
      request<ContentDetail>(`/contents/${contentId}/translate`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    translateContent: (contentId, input) =>
      request<TranslateContentResult>(`/contents/${contentId}/translate-content`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    updateSeo: (contentId, input) =>
      request<ContentDetail>(`/contents/${contentId}/seo`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
  };
};

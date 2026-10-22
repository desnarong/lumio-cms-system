import type {
  AiProposal,
  AnalyticsRange,
  AnalyticsSummary,
  AppBridgeResponse,
  AppStoreEntry,
  CreateSubscriberInput,
  ExternalAppPreview,
  InstalledApp,
  NotFoundList,
  SeoHealth,
  Subscriber,
  SubscriberExport,
  SubscriberList,
  SubscriberStatus,
} from '@lumio/shared';
import { translateNow } from '@lumio/ui';
import type { AiApi } from '../ai/api.js';
import { ApiError } from '../api-error.js';
import type { ContentApi } from '../editor/api.js';
import { readAdminLocale } from '../shell/locale-preference.js';

/**
 * The four "เติบโต" (Growth) screens (docs/design/05-admin-ia.md 5.1): SEO,
 * Analytics, Newsletter and Apps. Each has its own tiny client so tests can swap
 * in a fake.
 */

export interface SeoMetaInput {
  title: string;
  description: string;
}

/** The meta text a save replaced, so the screen can offer an undo. */
export interface SeoMetaSaved {
  previous: SeoMetaInput;
}

export interface SeoApi {
  getHealth(): Promise<SeoHealth>;
  /** The loudest 404s of the last 30 days, to turn into redirects. */
  getNotFound(): Promise<NotFoundList>;
  /**
   * Drafts the search title and description of one page
   * (docs/design/09-ai-assistant.md 9.2). Nothing is saved: the screen shows the
   * diff and the user decides.
   */
  suggestMeta(pageId: string): Promise<AiProposal>;
  /** Writes the accepted meta text and reports what it replaced. */
  saveMeta(pageId: string, meta: SeoMetaInput): Promise<SeoMetaSaved>;
}

export interface AnalyticsApi {
  getSummary(range: AnalyticsRange): Promise<AnalyticsSummary>;
}

export interface SubscriberQuery {
  status?: SubscriberStatus;
  q?: string;
  cursor?: string;
  limit?: number;
}

export interface NewsletterApi {
  list(query?: SubscriberQuery): Promise<SubscriberList>;
  add(input: CreateSubscriberInput): Promise<Subscriber>;
  setStatus(subscriberId: string, status: SubscriberStatus): Promise<Subscriber>;
  remove(subscriberId: string): Promise<void>;
  /** Returns the CSV the screen saves as a file. */
  exportCsv(): Promise<SubscriberExport>;
}

export interface AppsApi {
  store(): Promise<AppStoreEntry[]>;
  installed(): Promise<InstalledApp[]>;
  install(appKey: string): Promise<InstalledApp>;
  setEnabled(appKey: string, enabled: boolean): Promise<InstalledApp>;
  uninstall(appKey: string): Promise<void>;
  /** Validates a developer-hosted manifest before the owner installs it (16-apps.md). */
  previewExternal(url: string): Promise<ExternalAppPreview>;
  /** Installs an App from its manifest URL; the API fetches it again itself. */
  installExternal(url: string): Promise<InstalledApp>;
  /** Runs one sandboxed App call through the Lumio bridge (docs/design/16-apps.md 16.4). */
  callBridge(appKey: string, method: string, params?: Record<string, unknown>): Promise<unknown>;
}

interface Envelope<T> {
  data: T;
  meta?: { cursor?: string | null };
}

interface ErrorEnvelope {
  error?: string;
  message?: string;
}

export interface HttpGrowthApiConfig {
  /** API origin from `VITE_API_URL`. */
  baseUrl: string;
  getAccessToken?: () => string | null;
  getSiteId?: () => string | null;
  fetchImpl?: typeof fetch;
}

const queryString = (query: SubscriberQuery): string => {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.q) params.set('q', query.q);
  if (query.cursor) params.set('cursor', query.cursor);
  params.set('limit', String(query.limit ?? 20));
  return params.toString();
};

const makeRequest =
  ({ baseUrl, getAccessToken, getSiteId, fetchImpl }: HttpGrowthApiConfig) =>
  async <T>(path: string, init: RequestInit = {}): Promise<Envelope<T>> => {
    const doFetch = fetchImpl ?? globalThis.fetch.bind(globalThis);
    const token = getAccessToken?.() ?? null;
    const siteId = getSiteId?.() ?? null;

    const response = await doFetch(`${baseUrl}/api/v1${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(siteId ? { 'x-site-id': siteId } : {}),
        'x-locale': readAdminLocale(),
        ...(init.headers ?? {}),
      },
    });

    const payload = (await response.json().catch(() => null)) as Envelope<T> | ErrorEnvelope | null;

    if (!response.ok) {
      const error = payload as ErrorEnvelope | null;
      throw new ApiError(
        error?.error ?? 'internal_error',
        error?.message ?? translateNow('api.networkError'),
        response.status,
      );
    }

    return payload as Envelope<T>;
  };

/** The SEO screen also talks to the assistant and to the page's own meta fields. */
export interface HttpSeoApiConfig extends HttpGrowthApiConfig {
  ai: AiApi;
  content: ContentApi;
}

/** Talks to `/api/v1/seo`, `/api/v1/ai` and `PATCH /api/v1/contents/:id/seo`. */
export const createHttpSeoApi = ({ ai, content, ...config }: HttpSeoApiConfig): SeoApi => {
  const request = makeRequest(config);
  return {
    getHealth: async () => (await request<SeoHealth>('/seo/health')).data,
    getNotFound: async () => (await request<NotFoundList>('/seo/not-found')).data,
    suggestMeta: async (pageId) => (await ai.seo({ pageId })).proposal,
    saveMeta: async (pageId, meta) => {
      const current = await content.getContent(pageId);
      await content.updateSeo(pageId, { title: meta.title, description: meta.description });
      return {
        previous: {
          title: current.seo.title ?? '',
          description: current.seo.description ?? '',
        },
      };
    },
  };
};

/** Talks to `/api/v1/analytics`. */
export const createHttpAnalyticsApi = (config: HttpGrowthApiConfig): AnalyticsApi => {
  const request = makeRequest(config);
  return {
    getSummary: async (range) =>
      (await request<AnalyticsSummary>(`/analytics?range=${range}`)).data,
  };
};

/** Talks to `/api/v1/subscribers`. */
export const createHttpNewsletterApi = (config: HttpGrowthApiConfig): NewsletterApi => {
  const request = makeRequest(config);
  return {
    list: async (query = {}) => {
      const payload = await request<{
        items: Subscriber[];
        total: number;
        activeCount: number;
      }>(`/subscribers?${queryString(query)}`);
      return {
        items: payload.data.items ?? [],
        total: payload.data.total ?? 0,
        activeCount: payload.data.activeCount ?? 0,
        cursor: payload.meta?.cursor ?? null,
      };
    },
    add: async (input) =>
      (await request<Subscriber>('/subscribers', { method: 'POST', body: JSON.stringify(input) }))
        .data,
    setStatus: async (subscriberId, status) =>
      (
        await request<Subscriber>(`/subscribers/${subscriberId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        })
      ).data,
    remove: async (subscriberId) => {
      await request<{ success: boolean }>(`/subscribers/${subscriberId}`, { method: 'DELETE' });
    },
    exportCsv: async () => (await request<SubscriberExport>('/subscribers/export')).data,
  };
};

/** Talks to `/api/v1/apps` and `/api/v1/site-apps`. */
export const createHttpAppsApi = (config: HttpGrowthApiConfig): AppsApi => {
  const request = makeRequest(config);
  return {
    store: async () => (await request<AppStoreEntry[]>('/apps')).data,
    installed: async () => (await request<InstalledApp[]>('/site-apps')).data,
    install: async (appKey) =>
      (await request<InstalledApp>(`/site-apps/${appKey}`, { method: 'POST', body: '{}' })).data,
    setEnabled: async (appKey, enabled) =>
      (
        await request<InstalledApp>(`/site-apps/${appKey}`, {
          method: 'PATCH',
          body: JSON.stringify({ enabled }),
        })
      ).data,
    uninstall: async (appKey) => {
      await request<{ success: boolean }>(`/site-apps/${appKey}`, { method: 'DELETE' });
    },
    previewExternal: async (url) =>
      (
        await request<ExternalAppPreview>('/apps/external/preview', {
          method: 'POST',
          body: JSON.stringify({ url }),
        })
      ).data,
    installExternal: async (url) =>
      (
        await request<InstalledApp>('/apps/external', {
          method: 'POST',
          body: JSON.stringify({ url }),
        })
      ).data,
    callBridge: async (appKey, method, params) => {
      const response = await request<AppBridgeResponse>(`/site-apps/${appKey}/bridge`, {
        method: 'POST',
        body: JSON.stringify({
          id: `admin_${Date.now().toString(36)}`,
          method,
          ...(params ? { params } : {}),
        }),
      });
      if (!response.data.ok) {
        throw new ApiError(
          'forbidden',
          response.data.error ?? translateNow('apps.deniedRequest'),
          403,
        );
      }
      return response.data.result;
    },
  };
};

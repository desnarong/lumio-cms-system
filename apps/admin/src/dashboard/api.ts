import type { DashboardSummary } from '@lumio/shared';
import { translateNow } from '@lumio/ui';
import { ApiError } from '../api-error.js';
import { readAdminLocale } from '../shell/locale-preference.js';

/** Everything the dashboard screen needs (docs/design/05-admin-ia.md 5.2). */
export interface DashboardApi {
  getSummary(): Promise<DashboardSummary>;
  setChecklistDismissed(dismissed: boolean): Promise<void>;
}

interface Envelope<T> {
  data: T;
}

interface ErrorEnvelope {
  error?: string;
  message?: string;
}

export interface HttpDashboardApiConfig {
  baseUrl: string;
  getAccessToken?: () => string | null;
  getSiteId?: () => string | null;
  fetchImpl?: typeof fetch;
}

/** Talks to `/api/v1/dashboard` (site always sent as `X-Site-Id`). */
export const createHttpDashboardApi = ({
  baseUrl,
  getAccessToken,
  getSiteId,
  fetchImpl,
}: HttpDashboardApiConfig): DashboardApi => {
  const doFetch = fetchImpl ?? globalThis.fetch.bind(globalThis);

  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
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

    return (payload as Envelope<T>).data;
  };

  return {
    getSummary: () => request<DashboardSummary>('/dashboard'),
    setChecklistDismissed: async (dismissed) => {
      await request<{ dismissed: boolean }>('/dashboard/checklist', {
        method: 'PATCH',
        body: JSON.stringify({ dismissed }),
      });
    },
  };
};

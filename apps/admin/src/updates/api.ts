import type { UpdateStatus } from '@lumio/shared';
import { translateNow } from '@lumio/ui';
import { ApiError } from '../api-error.js';

/** Version and update notice (docs/design/18-deployment.md 18.8). */
export interface UpdatesApi {
  /** Last known state; the API caches the remote check. */
  status(): Promise<UpdateStatus>;
  /** Asks the API to re-read the release manifest right now. */
  check(): Promise<UpdateStatus>;
}

export interface HttpUpdatesApiConfig {
  baseUrl: string;
  getAccessToken?: () => string | null;
  fetchImpl?: typeof fetch;
}

interface Envelope<T> {
  data: T;
}

interface ErrorEnvelope {
  error?: string;
  message?: string;
}

export const createHttpUpdatesApi = ({
  baseUrl,
  getAccessToken,
  fetchImpl,
}: HttpUpdatesApiConfig): UpdatesApi => {
  const doFetch = fetchImpl ?? globalThis.fetch.bind(globalThis);

  const request = async (path: string, method: 'GET' | 'POST'): Promise<UpdateStatus> => {
    const token = getAccessToken?.() ?? null;
    const response = await doFetch(`${baseUrl}/api/v1${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
    });

    const payload = (await response.json().catch(() => null)) as
      Envelope<UpdateStatus> | ErrorEnvelope | null;

    if (!response.ok) {
      const error = payload as ErrorEnvelope | null;
      throw new ApiError(
        error?.error ?? 'internal_error',
        error?.message ?? translateNow('api.networkError'),
        response.status,
      );
    }

    return (payload as Envelope<UpdateStatus>).data;
  };

  return {
    status: () => request('/updates', 'GET'),
    check: () => request('/updates/check', 'POST'),
  };
};

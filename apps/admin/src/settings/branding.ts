import type { AgencyBrandingInput, AgencyView } from '@lumio/shared';
import { DEFAULT_AGENCY_BRANDING } from '@lumio/shared';
import { translateNow } from '@lumio/ui';
import { ApiError } from '../api-error.js';

/** White-label branding of this installation (docs/PROGRESS.md "งานนอก MVP"). */
export interface AgencyApi {
  get(): Promise<AgencyView>;
  update(input: AgencyBrandingInput): Promise<AgencyView>;
}

interface Envelope<T> {
  data: T;
}

interface ErrorEnvelope {
  error?: string;
  message?: string;
}

export interface HttpAgencyApiConfig {
  baseUrl: string;
  getAccessToken?: () => string | null;
  getSiteId?: () => string | null;
  fetchImpl?: typeof fetch;
}

export const createHttpAgencyApi = ({
  baseUrl,
  getAccessToken,
  getSiteId,
  fetchImpl,
}: HttpAgencyApiConfig): AgencyApi => {
  const doFetch = fetchImpl ?? globalThis.fetch.bind(globalThis);

  const send = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
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
      | Envelope<T>
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
    return (payload as Envelope<T>).data;
  };

  return {
    get: () => send<AgencyView>('/agency'),
    update: (input) =>
      send<AgencyView>('/agency', { method: 'PATCH', body: JSON.stringify(input) }),
  };
};

/** In-memory branding with the white-label switch turned on. */
export const createDemoAgencyApi = (): AgencyApi => {
  let current: AgencyView = { ...DEFAULT_AGENCY_BRANDING, licensed: true };

  return {
    get: async () => ({ ...current }),
    update: async (input) => {
      current = { ...current, ...input, licensed: true };
      return { ...current };
    },
  };
};

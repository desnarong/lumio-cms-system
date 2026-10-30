import {
  communityStatus,
  licenseStatusOfPayload,
  type LicenseStatus,
  type LicenseView,
} from '@lumio/shared';
import { translateNow } from '@lumio/ui';
import { ApiError } from '../api-error.js';

/** The deployment licence (docs/design/24-community-licensing.md 24.10). */
export interface LicenseApi {
  get(): Promise<LicenseView>;
  /** Verifies and stores a pasted token; never returns the token itself. */
  install(token: string): Promise<LicenseView>;
  /** Back to Community; the token is removed from the database. */
  remove(): Promise<LicenseView>;
  /** Asks the vendor for a fresh lease (online licences only). */
  refresh(): Promise<LicenseStatus>;
}

interface Envelope<T> {
  data: T;
}

interface ErrorEnvelope {
  error?: string;
  message?: string;
}

export interface HttpLicenseApiConfig {
  baseUrl: string;
  getAccessToken?: () => string | null;
  getSiteId?: () => string | null;
  fetchImpl?: typeof fetch;
}

export const createHttpLicenseApi = ({
  baseUrl,
  getAccessToken,
  getSiteId,
  fetchImpl,
}: HttpLicenseApiConfig): LicenseApi => {
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
    get: () => send<LicenseView>('/license'),
    install: (token) =>
      send<LicenseView>('/license', { method: 'PATCH', body: JSON.stringify({ token }) }),
    remove: () => send<LicenseView>('/license', { method: 'DELETE' }),
    refresh: () => send<LicenseStatus>('/license/refresh', { method: 'POST' }),
  };
};

/** A Pro licence issued yesterday, so the demo screen can be walked through. */
const demoPro = (): LicenseView => ({
  ...licenseStatusOfPayload({
    v: 1,
    sub: 'บริษัท ตัวอย่าง จำกัด',
    plan: 'pro',
    features: ['membership', 'marketplace', 'whitelabel'],
    seats: 3,
    iat: Math.floor(Date.now() / 1000) - 86_400,
    exp: Math.floor(Date.now() / 1000) + 365 * 86_400,
  }),
  source: 'database',
  installedAt: new Date().toISOString(),
});

export const createDemoLicenseApi = (): LicenseApi => {
  let current: LicenseView = { ...demoPro() };

  return {
    get: async () => ({ ...current }),
    install: async () => {
      current = { ...demoPro() };
      return { ...current };
    },
    remove: async () => {
      current = { ...communityStatus('missing'), source: 'none', installedAt: null };
      return { ...current };
    },
    refresh: async () => ({ ...current }),
  };
};

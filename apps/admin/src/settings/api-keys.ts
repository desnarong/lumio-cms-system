import type { ApiKey, ApiKeyCreated, ApiKeyInput } from '@lumio/shared';
import { translateNow } from '@lumio/ui';
import { ApiError } from '../api-error.js';

/** Keys that let an outside system read this site's published content. */
export interface ApiKeysApi {
  list(): Promise<ApiKey[]>;
  create(input: ApiKeyInput): Promise<ApiKeyCreated>;
  revoke(keyId: string): Promise<ApiKey>;
}

interface Envelope<T> {
  data: T;
}

interface ErrorEnvelope {
  error?: string;
  message?: string;
}

export interface HttpApiKeysApiConfig {
  baseUrl: string;
  getAccessToken?: () => string | null;
  getSiteId?: () => string | null;
  fetchImpl?: typeof fetch;
}

export const createHttpApiKeysApi = ({
  baseUrl,
  getAccessToken,
  getSiteId,
  fetchImpl,
}: HttpApiKeysApiConfig): ApiKeysApi => {
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
    list: async () => (await send<{ items: ApiKey[] }>('/api-keys')).items,
    create: (input) =>
      send<ApiKeyCreated>('/api-keys', { method: 'POST', body: JSON.stringify(input) }),
    revoke: (keyId) => send<ApiKey>(`/api-keys/${keyId}`, { method: 'DELETE' }),
  };
};

/** In-memory keys so the screen works before the API is up. */
export const createDemoApiKeysApi = (): ApiKeysApi => {
  const keys: ApiKey[] = [
    {
      id: 'demo-key-1',
      name: 'เว็บแอปมือถือ',
      hint: 'lum_demo0001',
      scopes: ['content:read'],
      createdAt: new Date('2026-10-20T03:00:00Z').toISOString(),
      lastUsedAt: new Date(Date.now() - 3_600_000).toISOString(),
      revokedAt: null,
    },
  ];
  let counter = 1;

  return {
    list: async () => [...keys],
    create: async (input) => {
      counter += 1;
      const now = new Date().toISOString();
      const key: ApiKey = {
        id: `demo-key-new-${counter}`,
        name: input.name,
        hint: 'lum_demo0002',
        scopes: input.scopes,
        createdAt: now,
        lastUsedAt: null,
        revokedAt: null,
      };
      keys.push(key);
      return { ...key, secret: `lum_${'demo'.repeat(8)}.${'A'.repeat(32)}` };
    },
    revoke: async (keyId) => {
      const key = keys.find((entry) => entry.id === keyId);
      if (!key) throw new Error('ไม่พบกุญแจนี้');
      key.revokedAt = new Date().toISOString();
      return key;
    },
  };
};

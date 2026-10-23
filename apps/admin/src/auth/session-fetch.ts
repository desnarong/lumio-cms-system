import type { AuthUser } from '@lumio/shared';
import type { SessionStore } from './session.js';

interface RefreshEnvelope {
  data?: { accessToken?: string; user?: AuthUser };
}

export interface SessionFetchOptions {
  /** API origin, e.g. `http://localhost:49100`. */
  baseUrl: string;
  session: SessionStore;
  /** Called when the refresh token is gone too, so the app can show the login screen. */
  onExpired?: () => void;
  fetchImpl?: typeof fetch;
}

const AUTH_PATHS = ['/auth/login', '/auth/2fa/verify', '/auth/refresh'];

const normaliseBase = (baseUrl: string): string => baseUrl.replace(/\/+$/, '');

const isApiRequest = (url: string, baseUrl: string): boolean =>
  url.startsWith(`${normaliseBase(baseUrl)}/api/v1/`);

const isAuthRequest = (url: string): boolean => {
  const path = new URL(url).pathname;
  return AUTH_PATHS.some((authPath) => path.endsWith(authPath));
};

const withAccessToken = (init: RequestInit, accessToken: string): RequestInit => {
  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${accessToken}`);
  return { ...init, headers };
};

/**
 * Keeps a signed-in admin working across access-token expiry. The API puts the
 * long-lived refresh token in an httpOnly cookie, so a 401 is retried once
 * after `/auth/refresh`; only when that fails as well does the session get
 * cleared and the login screen appear (docs/design/12-api.md 12.5).
 *
 * Requests to the login endpoints are left alone, so a wrong password never
 * looks like an expired session.
 */
export const createSessionFetch = ({
  baseUrl,
  session,
  onExpired,
  fetchImpl,
}: SessionFetchOptions): typeof fetch => {
  const doFetch = fetchImpl ?? globalThis.fetch.bind(globalThis);
  let refreshing: Promise<string | null> | null = null;

  const refresh = (): Promise<string | null> => {
    if (refreshing) return refreshing;

    refreshing = (async () => {
      try {
        const response = await doFetch(`${normaliseBase(baseUrl)}/api/v1/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
        });
        if (!response.ok) return null;

        const payload = (await response.json().catch(() => null)) as RefreshEnvelope | null;
        const data = payload?.data;
        const current = session.read();
        if (!data?.accessToken || !data.user || !current) return null;

        session.write({ ...current, accessToken: data.accessToken, user: data.user });
        return data.accessToken;
      } catch {
        return null;
      } finally {
        refreshing = null;
      }
    })();

    return refreshing;
  };

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await doFetch(input, init);
    if (response.status !== 401 || !session.read()) return response;

    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    // Storage uploads get a signed URL that is not an API request; a 401 there
    // must not sign the editor out.
    if (!isApiRequest(url, baseUrl) || isAuthRequest(url)) return response;

    const accessToken = await refresh();
    if (!accessToken) {
      session.clear();
      onExpired?.();
      return response;
    }

    const retried = await doFetch(input, withAccessToken(init ?? {}, accessToken));
    // A fresh token that is still refused means the session is truly gone.
    if (retried.status === 401) {
      session.clear();
      onExpired?.();
    }
    return retried;
  };
};

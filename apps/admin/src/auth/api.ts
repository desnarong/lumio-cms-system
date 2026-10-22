import {
  isTwoFactorChallenge,
  type AuthUser,
  type LoginInput,
  type SignInResponse,
  type TwoFactorEnabled,
  type TwoFactorSetup,
  type TwoFactorStatus,
} from '@lumio/shared';
import { translateNow } from '@lumio/ui';
import { ApiError } from '../editor/api.js';

/** A fully signed-in session; the two-step flow only resolves once 2FA passes. */
export interface SignInResult {
  user: AuthUser;
  accessToken: string;
}

/** Everything the sign-in screen and the security panel need from the API. */
export interface AuthApi {
  login(input: LoginInput): Promise<SignInResponse>;
  /** Second step of sign-in, exchanged together with a TOTP/recovery code. */
  verifyTwoFactor(challengeToken: string, code: string): Promise<SignInResult>;
  me(): Promise<AuthUser>;
  logout(): Promise<void>;
  twoFactorStatus(): Promise<TwoFactorStatus>;
  /** Starts setup; the returned secret is pending until a code confirms it. */
  startTwoFactor(): Promise<TwoFactorSetup>;
  enableTwoFactor(code: string): Promise<TwoFactorEnabled>;
  disableTwoFactor(password: string, code: string): Promise<TwoFactorStatus>;
}

interface Envelope<T> {
  data: T;
}

interface ErrorEnvelope {
  error?: string;
  message?: string;
}

export interface HttpAuthApiConfig {
  /** API origin, e.g. `http://localhost:49100`. */
  baseUrl: string;
  /**
   * Current access token. The admin keeps it in the session store, so management
   * calls keep working after a page reload instead of only right after sign-in.
   */
  getAccessToken?: () => string | null;
  fetchImpl?: typeof fetch;
}

/**
 * Talks to `/api/v1/auth`. The API answers with `{ user, accessToken }` and sets
 * the refresh token as an httpOnly cookie, so sign-in survives a page reload
 * without keeping a long-lived token in JavaScript (docs/design/12-api.md 12.5).
 * Accounts with 2FA enabled answer with a short-lived challenge instead.
 */
export const createHttpAuthApi = ({
  baseUrl,
  getAccessToken,
  fetchImpl,
}: HttpAuthApiConfig): AuthApi => {
  const doFetch = fetchImpl ?? globalThis.fetch.bind(globalThis);
  let token: string | null = null;

  const currentToken = (): string | null => token ?? getAccessToken?.() ?? null;

  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await doFetch(`${baseUrl}/api/v1${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        ...(currentToken() ? { authorization: `Bearer ${currentToken()}` } : {}),
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

  const remember = (result: SignInResult): SignInResult => {
    token = result.accessToken;
    return result;
  };

  return {
    login: async (input) => {
      const result = await request<SignInResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      if (!isTwoFactorChallenge(result)) token = result.accessToken;
      return result;
    },

    verifyTwoFactor: async (challengeToken, code) =>
      remember(
        await request<SignInResult>('/auth/2fa/verify', {
          method: 'POST',
          body: JSON.stringify({ challengeToken, code }),
        }),
      ),

    me: () => request<AuthUser>('/auth/me'),

    logout: async () => {
      await request<{ success: boolean }>('/auth/logout', { method: 'POST' });
      token = null;
    },

    twoFactorStatus: () => request<TwoFactorStatus>('/auth/2fa'),

    startTwoFactor: () =>
      request<TwoFactorSetup>('/auth/2fa/setup', { method: 'POST', body: '{}' }),

    enableTwoFactor: (code) =>
      request<TwoFactorEnabled>('/auth/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),

    disableTwoFactor: (password, code) =>
      request<TwoFactorStatus>('/auth/2fa/disable', {
        method: 'POST',
        body: JSON.stringify({ password, code }),
      }),
  };
};

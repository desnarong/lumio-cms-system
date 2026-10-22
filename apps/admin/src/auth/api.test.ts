import { describe, expect, it, vi } from 'vitest';
import { isTwoFactorChallenge } from '@lumio/shared';
import { ApiError } from '../editor/api.js';
import { createDemoAuthApi } from './demo.js';
import { createHttpAuthApi, type SignInResult } from './api.js';

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const signedIn = (result: unknown): SignInResult => {
  if (isTwoFactorChallenge(result as never)) throw new Error('expected a session, got a challenge');
  return result as SignInResult;
};

describe('createHttpAuthApi', () => {
  it('signs in and keeps the access token for later calls', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({ data: { user: { id: 'u1' }, accessToken: 'token-1' } }),
    );
    const api = createHttpAuthApi({
      baseUrl: 'http://api.test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = signedIn(
      await api.login({ email: 'owner@lumio.app', password: 'lumio-demo-1234' }),
    );

    expect(result.accessToken).toBe('token-1');
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.test/api/v1/auth/login',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('surfaces the API Thai message on a failed sign-in', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({ error: 'unauthorized', message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, 401),
    );
    const api = createHttpAuthApi({
      baseUrl: 'http://api.test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(api.login({ email: 'a@b.com', password: 'x' })).rejects.toMatchObject({
      code: 'unauthorized',
      message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
      status: 401,
    });
  });

  it('sends the bearer token on /auth/me', async () => {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) =>
      jsonResponse({ data: { user: { id: 'u1' }, accessToken: 'token-1' } }),
    );
    const api = createHttpAuthApi({
      baseUrl: 'http://api.test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await api.login({ email: 'owner@lumio.app', password: 'lumio-demo-1234' });

    await api.me();

    const call = fetchImpl.mock.calls[1];
    expect(call?.[0]).toBe('http://api.test/api/v1/auth/me');
    expect((call?.[1]?.headers as Record<string, string>).authorization).toBe('Bearer token-1');
  });

  it('carries the challenge through the second step', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ data: { twoFactorRequired: true, challengeToken: 'challenge-1' } }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ data: { user: { id: 'u1' }, accessToken: 'token-2' } }),
      );
    const api = createHttpAuthApi({
      baseUrl: 'http://api.test',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const challenge = await api.login({ email: 'owner@lumio.app', password: 'lumio-demo-1234' });
    expect(isTwoFactorChallenge(challenge)).toBe(true);

    const session = await api.verifyTwoFactor('challenge-1', '123456');

    expect(session.accessToken).toBe('token-2');
    const [url, init] = fetchImpl.mock.calls[1] as [string, RequestInit];
    expect(url).toBe('http://api.test/api/v1/auth/2fa/verify');
    expect(JSON.parse(String(init.body))).toEqual({
      challengeToken: 'challenge-1',
      code: '123456',
    });
  });

  it('uses the session token for the two-factor settings endpoints', async () => {
    const fetchImpl = vi.fn(async (url: string, _init?: RequestInit) =>
      jsonResponse({
        data: String(url).endsWith('/auth/2fa')
          ? { enabled: true, recoveryCodesLeft: 3 }
          : { secret: 'ABC', otpauthUrl: 'otpauth://totp/x' },
      }),
    );
    const api = createHttpAuthApi({
      baseUrl: 'http://api.test',
      getAccessToken: () => 'session-token',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const status = await api.twoFactorStatus();

    expect(status).toEqual({ enabled: true, recoveryCodesLeft: 3 });
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer session-token');
  });
});

describe('createDemoAuthApi', () => {
  it('accepts the demo account', async () => {
    const api = createDemoAuthApi();
    const result = await api.login({ email: 'owner@lumio.app', password: 'lumio-demo-1234' });

    if (isTwoFactorChallenge(result)) throw new Error('demo signs in directly');
    expect(result.user.email).toBe('owner@lumio.app');
  });

  it('explains the demo credentials when they are wrong', async () => {
    const api = createDemoAuthApi();

    await expect(api.login({ email: 'someone@else.com', password: 'x' })).rejects.toBeInstanceOf(
      ApiError,
    );
    await expect(api.login({ email: 'someone@else.com', password: 'x' })).rejects.toMatchObject({
      message: expect.stringContaining('owner@lumio.app'),
    });
  });

  it('simulates turning two-step verification on and off', async () => {
    const api = createDemoAuthApi();

    expect(await api.twoFactorStatus()).toEqual({ enabled: false, recoveryCodesLeft: 0 });
    const setup = await api.startTwoFactor();
    expect(setup.secret.length).toBeGreaterThan(10);

    await expect(api.enableTwoFactor('000000')).rejects.toBeInstanceOf(ApiError);
    const enabled = await api.enableTwoFactor('123456');
    expect(enabled.recoveryCodes).toHaveLength(10);
    expect(await api.twoFactorStatus()).toEqual({ enabled: true, recoveryCodesLeft: 10 });

    await expect(api.disableTwoFactor('wrong', '123456')).rejects.toBeInstanceOf(ApiError);
    await api.disableTwoFactor('lumio-demo-1234', '123456');
    expect(await api.twoFactorStatus()).toEqual({ enabled: false, recoveryCodesLeft: 0 });
  });
});

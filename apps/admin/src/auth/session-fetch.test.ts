import { describe, expect, it, vi } from 'vitest';
import { createSessionFetch } from './session-fetch.js';
import { createMemoryStorage, createSessionStore } from './session.js';

const BASE = 'http://api.test';
const USER = { id: 'u1', email: 'owner@example.com', name: 'สมชาย', avatarUrl: null };

const signedInStore = () => {
  const session = createSessionStore(createMemoryStorage());
  session.write({ accessToken: 'old-token', user: USER, siteId: 'site-1' });
  return session;
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const authorization = (init?: RequestInit): string | null =>
  new Headers(init?.headers).get('authorization');

const urlOf = (input: RequestInfo | URL): string =>
  typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

describe('createSessionFetch', () => {
  it('refreshes once after a 401 and retries with the new access token', async () => {
    const session = signedInStore();
    const seen: string[] = [];

    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = urlOf(input);
      seen.push(url);
      if (url.endsWith('/auth/refresh')) {
        return json({ data: { accessToken: 'new-token', user: USER } });
      }
      return authorization(init) === 'Bearer new-token'
        ? json({ data: { items: [] } })
        : json({ error: 'unauthorized', message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' }, 401);
    });

    const sessionFetch = createSessionFetch({
      baseUrl: BASE,
      session,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await sessionFetch(`${BASE}/api/v1/contents`, {
      headers: { authorization: 'Bearer old-token' },
    });

    expect(response.status).toBe(200);
    expect(session.read()?.accessToken).toBe('new-token');
    expect(seen).toEqual([
      `${BASE}/api/v1/contents`,
      `${BASE}/api/v1/auth/refresh`,
      `${BASE}/api/v1/contents`,
    ]);
  });

  it('shares one refresh between requests that fail together', async () => {
    const session = signedInStore();
    const refresh = vi.fn(async () => json({ data: { accessToken: 'new-token', user: USER } }));

    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (urlOf(input).endsWith('/auth/refresh')) return refresh();
      return authorization(init) === 'Bearer new-token'
        ? json({ data: [] })
        : json({ error: 'unauthorized', message: 'เซสชันหมดอายุ' }, 401);
    });

    const sessionFetch = createSessionFetch({
      baseUrl: BASE,
      session,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const responses = await Promise.all([
      sessionFetch(`${BASE}/api/v1/contents`),
      sessionFetch(`${BASE}/api/v1/media`),
    ]);

    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('clears the session when a freshly refreshed token is refused as well', async () => {
    const session = signedInStore();
    const onExpired = vi.fn();
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) =>
      urlOf(input).endsWith('/auth/refresh')
        ? json({ data: { accessToken: 'new-token', user: USER } })
        : json({ error: 'unauthorized', message: 'เซสชันหมดอายุ' }, 401),
    );

    const sessionFetch = createSessionFetch({
      baseUrl: BASE,
      session,
      onExpired,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await sessionFetch(`${BASE}/api/v1/contents`);

    expect(response.status).toBe(401);
    expect(session.read()).toBeNull();
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('clears the session and reports expiry when the refresh is rejected too', async () => {
    const session = signedInStore();
    const onExpired = vi.fn();
    const fetchImpl = vi.fn(async () =>
      json({ error: 'unauthorized', message: 'เซสชันหมดอายุ' }, 401),
    );

    const sessionFetch = createSessionFetch({
      baseUrl: BASE,
      session,
      onExpired,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await sessionFetch(`${BASE}/api/v1/contents`);

    expect(response.status).toBe(401);
    expect(session.read()).toBeNull();
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('leaves a failed sign-in alone instead of treating it as an expired session', async () => {
    const session = signedInStore();
    const onExpired = vi.fn();
    const fetchImpl = vi.fn(async () =>
      json({ error: 'unauthorized', message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, 401),
    );

    const sessionFetch = createSessionFetch({
      baseUrl: BASE,
      session,
      onExpired,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const response = await sessionFetch(`${BASE}/api/v1/auth/login`, { method: 'POST' });

    expect(response.status).toBe(401);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(session.read()?.accessToken).toBe('old-token');
    expect(onExpired).not.toHaveBeenCalled();
  });
});

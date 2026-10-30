import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createHmac, generateKeyPairSync, sign } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, type TestingModule, type TestingModuleBuilder } from '@nestjs/testing';
import type { Role } from '@lumio/shared';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../app.module';
import { ApiExceptionFilter } from '../common/api-exception.filter';
import { resolveAllowedOrigins } from '../common/origin.guard';
import { RATE_LIMIT_STORE } from '../common/rate-limit.module';
import { MemoryRateLimitStore } from '../common/rate-limit.store';
import { ResponseInterceptor } from '../common/response.interceptor';
import { securityHeadersMiddleware } from '../common/security-headers';
import { getAuthConfig } from '../modules/auth/auth.config';
import { AuthService } from '../modules/auth/auth.service';
import { BillingService } from '../modules/billing/billing.service';
import { ContentsService } from '../modules/contents/contents.service';
import { PrismaService } from '../modules/prisma/prisma.service';
import { MarketplaceService } from '../modules/marketplace/marketplace.service';
import { PublicService } from '../modules/public/public.service';
import { RedirectsService } from '../modules/redirects/redirects.service';
import { LicenseStore } from '../modules/license/license.store';

// A baked vendor key always wins over the env, so the suite supplies its own.
vi.mock('../modules/license/license.keys', () => ({ LICENSE_PUBLIC_KEY: '' }));

/**
 * HTTP-level checks (docs/design/15-security.md 15.2). The unit specs prove each
 * guard, header and interceptor on its own; this suite boots the real
 * `AppModule` on a random port and talks to it with `fetch`, so middleware
 * order, the guard chain and the response envelope are verified together over
 * the wire.
 *
 * Only the database and the services that would need it are replaced, so the
 * suite runs without `DATABASE_URL`. Guards, filters, interceptors, the rate
 * limiter and the static/header middleware are the real implementations.
 */

const SITE_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const ALLOWED_ORIGIN = 'http://localhost:49300';

/**
 * Signs an HS256 access token the way `TokenService` does, using the same
 * secret from the environment. Building it here keeps the harness free of DI so
 * it stays a plain HTTP test.
 */
const signAccessToken = (user: { id: string; email: string }): string => {
  const encode = (value: object): string =>
    Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    sub: user.id,
    email: user.email,
    typ: 'access',
    iat: now,
    exp: now + 900,
  });
  const signature = createHmac('sha256', getAuthConfig().accessSecret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
};

interface Harness {
  url: string;
  /** Membership the fake RLS client reports; mutate to change the outcome. */
  membership: { role: Role | null };
  token: string;
  request(path: string, init?: RequestInit): Promise<Response>;
  close(): Promise<void>;
}

const startApp = async (options: {
  membershipRole?: Role | null;
  /** Add-on switches the fake site reports (`sites.settings.flags`). */
  siteFlags?: Record<string, boolean>;
  configure?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
} = {}): Promise<Harness> => {
  const membership = {
    role: (options.membershipRole === undefined ? 'owner' : options.membershipRole) as Role | null,
  };
  const settings = { flags: options.siteFlags ?? {} };

  // The membership and site lookups are the only database calls the guard chain
  // makes, so a tiny in-memory stand-in is enough to exercise them for real.
  const tx = {
    siteMember: {
      findFirst: async (): Promise<{ role: string } | null> =>
        membership.role === null ? null : { role: membership.role },
    },
    site: {
      findUnique: async (): Promise<{ settings: unknown }> => ({ settings }),
    },
  };
  const fakeDb = {
    forSite: (_siteId: string, fn: (client: unknown) => Promise<unknown>) => fn(tx),
    forUser: (_userId: string, fn: (client: unknown) => Promise<unknown>) => fn(tx),
  };

  let builder: TestingModuleBuilder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(fakeDb)
    // A fresh in-process counter per app keeps the rate limit checks
    // deterministic and independent of a running Redis.
    .overrideProvider(RATE_LIMIT_STORE)
    .useValue(new MemoryRateLimitStore());
  if (options.configure) builder = options.configure(builder);

  const moduleRef: TestingModule = await builder.compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>();

  // Same wiring as `main.ts`, minus the static mounts.
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.enableCors({ origin: resolveAllowedOrigins(), credentials: true });
  app.use(securityHeadersMiddleware());
  await app.listen(0);

  const address = (app.getHttpServer() as Server).address() as AddressInfo | null;
  if (address === null) throw new Error('test app did not bind a port');
  const url = `http://127.0.0.1:${address.port}`;
  const token = signAccessToken({ id: USER_ID, email: 'owner@example.com' });

  return {
    url,
    membership,
    token,
    request: (path, init) => fetch(`${url}${path}`, init),
    close: async () => {
      await app.close();
    },
  };
};

const readJson = async (response: Response): Promise<Record<string, unknown>> =>
  (await response.json()) as Record<string, unknown>;

const jsonRequest = (
  body: unknown,
  extra: Record<string, string> = {},
  method = 'POST',
): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json', ...extra },
  body: JSON.stringify(body),
});

const withSession = (token: string, siteId: string | null = SITE_ID): Record<string, string> => ({
  authorization: `Bearer ${token}`,
  ...(siteId === null ? {} : { 'X-Site-Id': siteId }),
});

describe('API over HTTP', () => {
  describe('security headers and the error envelope', () => {
    let app: Harness;

    beforeAll(async () => {
      app = await startApp();
    });
    afterAll(async () => {
      await app.close();
    });

    it('stamps the security headers on a successful response', async () => {
      const response = await app.request('/api/health');

      expect(response.status).toBe(200);
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');
      expect(response.headers.get('x-frame-options')).toBe('DENY');
      expect(response.headers.get('cross-origin-resource-policy')).toBe('cross-origin');
      expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");
      expect(response.headers.get('permissions-policy')).toContain('camera=()');

      const body = await readJson(response);
      expect(body.data).toEqual({ status: 'ok', uptime: expect.any(Number), timestamp: expect.any(String) });
    });

    it('keeps the headers on an error and answers with the error envelope', async () => {
      const response = await app.request('/api/v1/does-not-exist');

      expect(response.status).toBe(404);
      expect(response.headers.get('x-content-type-options')).toBe('nosniff');

      const body = await readJson(response);
      expect(body.error).toBe('not_found');
      expect(typeof body.message).toBe('string');
    });

    it('wraps a validation failure in `{ error, message, details }`', async () => {
      const response = await app.request(
        '/api/v1/auth/login',
        jsonRequest({ email: 'not-an-email' }, { origin: ALLOWED_ORIGIN }),
      );

      expect(response.status).toBe(400);
      const body = await readJson(response);
      expect(body.error).toBe('validation_error');
      expect(body.message).toBe('ข้อมูลที่ส่งมาไม่ถูกต้อง');
      expect(Array.isArray(body.details)).toBe(true);
    });
  });

  describe('CSRF origin allow-list', () => {
    let app: Harness;

    beforeAll(async () => {
      app = await startApp({
        configure: (builder) =>
          builder
            .overrideProvider(AuthService)
            .useValue({
              login: async () => ({
                user: { id: USER_ID, email: 'owner@example.com' },
                accessToken: 'test-access',
                refreshToken: 'test-refresh',
              }),
            })
            .overrideProvider(BillingService)
            .useValue({
              summary: async () => ({ plan: 'pro' }),
              changePlan: async () => ({ plan: 'pro' }),
            }),
      });
    });
    afterAll(async () => {
      await app.close();
    });

    it('refuses a state-changing request from a foreign origin', async () => {
      const response = await app.request(
        '/api/v1/billing/plan',
        jsonRequest(
          { plan: 'pro' },
          { origin: 'https://evil.example', ...withSession(app.token) },
          'PATCH',
        ),
      );

      expect(response.status).toBe(403);
      const body = await readJson(response);
      expect(body.error).toBe('forbidden');
      expect(body.message).toBe('คำขอมาจากโดเมนที่ไม่อนุญาต');
    });

    it('lets the admin origin through to the handler', async () => {
      const response = await app.request(
        '/api/v1/billing/plan',
        jsonRequest(
          { plan: 'pro' },
          { origin: ALLOWED_ORIGIN, ...withSession(app.token) },
          'PATCH',
        ),
      );

      expect(response.status).toBe(200);
    });

    it('leaves server-to-server calls (no Origin) alone', async () => {
      const response = await app.request(
        '/api/v1/auth/login',
        jsonRequest({ email: 'owner@example.com', password: 'lumio-demo-1234' }),
      );

      // Reaching the handler (201) proves the request was not blocked as CSRF.
      expect(response.status).toBe(201);
    });
  });

  describe('auth, site scope and roles', () => {
    let app: Harness;

    beforeAll(async () => {
      app = await startApp({
        configure: (builder) =>
          builder
            .overrideProvider(BillingService)
            .useValue({
              summary: async () => ({ plan: 'pro' }),
              changePlan: async () => ({ plan: 'pro' }),
            })
            .overrideProvider(AuthService)
            .useValue({
              login: async () => ({
                user: { id: USER_ID, email: 'owner@example.com' },
                accessToken: 'test-access',
                refreshToken: 'test-refresh',
              }),
            }),
      });
    });
    afterAll(async () => {
      await app.close();
    });

    it('rejects a request without a bearer token', async () => {
      const response = await app.request('/api/v1/sites', {
        headers: { 'X-Site-Id': SITE_ID },
      });

      expect(response.status).toBe(401);
      const body = await readJson(response);
      expect(body.error).toBe('unauthorized');
    });

    it('rejects a forged bearer token', async () => {
      const response = await app.request('/api/v1/sites', {
        headers: withSession('not.a.token'),
      });

      expect(response.status).toBe(401);
      expect((await readJson(response)).error).toBe('unauthorized');
    });

    it('asks for the target site when the header is missing', async () => {
      const response = await app.request('/api/v1/billing', {
        headers: withSession(app.token, null),
      });

      expect(response.status).toBe(400);
      const body = await readJson(response);
      expect(body.error).toBe('validation_error');
      expect(body.message).toBe('ต้องระบุเว็บที่ต้องการใช้งาน (X-Site-Id)');
    });

    it('refuses a signed-in user who is not a member of the site', async () => {
      app.membership.role = null;
      const response = await app.request('/api/v1/billing', {
        headers: withSession(app.token),
      });

      expect(response.status).toBe(403);
      const body = await readJson(response);
      expect(body.error).toBe('forbidden');
      expect(body.message).toBe('คุณไม่ได้เป็นสมาชิกของเว็บนี้');
    });

    it('refuses a member whose role the route does not allow', async () => {
      app.membership.role = 'editor';
      const response = await app.request(
        '/api/v1/billing/plan',
        jsonRequest({ plan: 'pro' }, withSession(app.token), 'PATCH'),
      );

      expect(response.status).toBe(403);
      expect((await readJson(response)).error).toBe('forbidden');
    });

    it('lets the owner read the plan and keeps the `{ data }` envelope', async () => {
      app.membership.role = 'owner';
      const response = await app.request('/api/v1/billing', {
        headers: withSession(app.token),
      });

      expect(response.status).toBe(200);
      expect(await readJson(response)).toEqual({ data: { plan: 'pro' } });
    });

    it('logs in through the real controller and sets the refresh cookie', async () => {
      const response = await app.request(
        '/api/v1/auth/login',
        jsonRequest({ email: 'owner@example.com', password: 'lumio-demo-1234' }, { origin: ALLOWED_ORIGIN }),
      );

      expect(response.status).toBe(201);
      const body = await readJson(response);
      expect(body.data).toEqual({
        user: { id: USER_ID, email: 'owner@example.com' },
        accessToken: 'test-access',
      });
      const cookie = response.headers.get('set-cookie') ?? '';
      expect(cookie).toContain('lumio_refresh=');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Lax');
    });
  });

  describe('public delivery and caching', () => {
    let app: Harness;

    beforeAll(async () => {
      app = await startApp({
        configure: (builder) =>
          builder.overrideProvider(PublicService).useValue({
            getPage: async (host: string, slug: string) => ({
              site: { name: 'กาแฟบ้านดอย', host },
              page: { slug, blocks: [] },
            }),
          }),
      });
    });
    afterAll(async () => {
      await app.close();
    });

    it('serves a published page without any token and marks it cacheable', async () => {
      const response = await app.request('/api/v1/public/baandoi.example.com/pages/home');

      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe(
        'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
      );
      expect(response.headers.get('etag')).toMatch(/^W\//);

      const body = await readJson(response);
      expect(body.data).toMatchObject({ page: { slug: 'home' } });
    });

    it('answers 304 when the caller already holds that ETag', async () => {
      const first = await app.request('/api/v1/public/baandoi.example.com/pages/home');
      const etag = first.headers.get('etag');
      expect(etag).not.toBeNull();

      const second = await app.request('/api/v1/public/baandoi.example.com/pages/home', {
        headers: { 'if-none-match': etag ?? '' },
      });

      expect(second.status).toBe(304);
      expect(await second.text()).toBe('');
    });

    it('validates the body of the anonymous page-view beacon', async () => {
      const response = await app.request(
        '/api/v1/public/baandoi.example.com/collect',
        jsonRequest({ nope: true }),
      );

      expect(response.status).toBe(400);
      expect((await readJson(response)).error).toBe('validation_error');
    });
  });

  describe('rate limiting', () => {
    let app: Harness;

    beforeAll(async () => {
      app = await startApp({
        configure: (builder) =>
          builder.overrideProvider(AuthService).useValue({
            login: async () => ({
              user: { id: USER_ID, email: 'owner@example.com' },
              accessToken: 'test-access',
              refreshToken: 'test-refresh',
            }),
          }),
      });
    });
    afterAll(async () => {
      await app.close();
    });

    it('allows ten logins a minute from one address and then answers 429', async () => {
      const attempt = async (): Promise<number> => {
        const response = await app.request(
          '/api/v1/auth/login',
          jsonRequest(
            { email: 'owner@example.com', password: 'lumio-demo-1234' },
            { origin: ALLOWED_ORIGIN },
          ),
        );
        return response.status;
      };

      const statuses: number[] = [];
      for (let index = 0; index < 11; index += 1) statuses.push(await attempt());

      expect(statuses.slice(0, 10)).toEqual([201, 201, 201, 201, 201, 201, 201, 201, 201, 201]);
      expect(statuses[10]).toBe(429);

      const blocked = await app.request(
        '/api/v1/auth/login',
        jsonRequest(
          { email: 'owner@example.com', password: 'lumio-demo-1234' },
          { origin: ALLOWED_ORIGIN },
        ),
      );
      const body = await readJson(blocked);
      expect(body.error).toBe('rate_limited');
      expect(body.message).toBe('ทำรายการถี่เกินไป กรุณารอสักครู่');
    });
  });

  describe('contents meta endpoint', () => {
    let app: Harness;

    beforeAll(async () => {
      app = await startApp({
        configure: (builder) =>
          builder.overrideProvider(ContentsService).useValue({
            updateSeo: async (
              _siteId: string,
              contentId: string,
              patch: Record<string, unknown>,
            ) => ({ id: contentId, seo: patch }),
          }),
      });
    });
    afterAll(async () => {
      await app.close();
    });

    it('writes only the meta fields that were sent', async () => {
      const response = await app.request(
        '/api/v1/contents/8f000000-0000-4000-8000-000000000001/seo',
        jsonRequest({ title: 'บริการซ่อมรถยนต์' }, withSession(app.token), 'PATCH'),
      );

      expect(response.status).toBe(200);
      expect((await readJson(response)).data).toEqual({
        id: '8f000000-0000-4000-8000-000000000001',
        seo: { title: 'บริการซ่อมรถยนต์' },
      });
    });

    it('rejects a title longer than a search result allows', async () => {
      const response = await app.request(
        '/api/v1/contents/8f000000-0000-4000-8000-000000000001/seo',
        jsonRequest({ title: 'x'.repeat(71) }, withSession(app.token), 'PATCH'),
      );

      expect(response.status).toBe(400);
      expect((await readJson(response)).error).toBe('validation_error');
    });

    it('refuses a viewer', async () => {
      app.membership.role = 'viewer';
      const response = await app.request(
        '/api/v1/contents/8f000000-0000-4000-8000-000000000001/seo',
        jsonRequest({ title: 'ok' }, withSession(app.token), 'PATCH'),
      );

      expect(response.status).toBe(403);
      app.membership.role = 'owner';
    });
  });

  describe('stripe webhook', () => {
    let app: Harness;
    const secret = 'whsec_http_test';
    const event = {
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: 'inv-1',
          payment_status: 'paid',
          metadata: { siteId: SITE_ID, plan: 'pro' },
        },
      },
    };
    const payload = JSON.stringify(event);
    const signature = (now: number): string =>
      `t=${now},v1=${createHmac('sha256', secret).update(`${now}.${payload}`).digest('hex')}`;

    beforeAll(async () => {
      process.env.STRIPE_WEBHOOK_SECRET = secret;
      app = await startApp({
        configure: (builder) =>
          builder.overrideProvider(BillingService).useValue({
            handleStripeEvent: async () => ({ handled: true, invoiceId: 'inv-1' }),
          }),
      });
    });
    afterAll(async () => {
      await app.close();
      delete process.env.STRIPE_WEBHOOK_SECRET;
    });

    it('refuses a webhook without a Stripe signature', async () => {
      const response = await app.request('/api/v1/billing/webhook', jsonRequest(event));

      expect(response.status).toBe(401);
      expect((await readJson(response)).error).toBe('unauthorized');
    });

    it('accepts a signed event without any session', async () => {
      const now = Math.floor(Date.now() / 1000);
      const response = await app.request(
        '/api/v1/billing/webhook',
        jsonRequest(event, { 'stripe-signature': signature(now) }),
      );

      expect(response.status).toBe(201);
      expect(await readJson(response)).toEqual({
        data: { handled: true, invoiceId: 'inv-1' },
      });
    });
  });

  describe('two-factor sign-in', () => {
    let app: Harness;

    beforeAll(async () => {
      app = await startApp({
        configure: (builder) =>
          builder.overrideProvider(AuthService).useValue({
            login: async () => ({ twoFactorRequired: true, challengeToken: 'ticket-1' }),
            verifyTwoFactor: async () => ({
              user: { id: USER_ID, email: 'owner@example.com', name: 'สมชาย', avatarUrl: null },
              accessToken: 'access-2',
              refreshToken: 'refresh-2',
            }),
          }),
      });
    });
    afterAll(async () => {
      await app.close();
    });

    it('answers the password step with a challenge instead of a session', async () => {
      const response = await app.request(
        '/api/v1/auth/login',
        jsonRequest({ email: 'owner@example.com', password: 'lumio-demo-1234' }),
      );

      expect(response.status).toBe(201);
      expect(await readJson(response)).toEqual({
        data: { twoFactorRequired: true, challengeToken: 'ticket-1' },
      });
      expect(response.headers.get('set-cookie')).toBeNull();
    });

    it('sets the refresh cookie only after the code is verified', async () => {
      const response = await app.request(
        '/api/v1/auth/2fa/verify',
        jsonRequest({ challengeToken: 'ticket-1234567890abcdef', code: '123456' }),
      );

      expect(response.status).toBe(201);
      expect(await readJson(response)).toEqual({
        data: {
          user: { id: USER_ID, email: 'owner@example.com', name: 'สมชาย', avatarUrl: null },
          accessToken: 'access-2',
        },
      });
      expect(response.headers.get('set-cookie') ?? '').toContain('lumio_refresh=');
    });

    it('rejects a code that is not six digits', async () => {
      const response = await app.request(
        '/api/v1/auth/2fa/verify',
        jsonRequest({ challengeToken: 'ticket-1234567890abcdef', code: '123' }),
      );

      expect(response.status).toBe(400);
      expect((await readJson(response)).error).toBe('validation_error');
    });
  });

  describe('redirect manager', () => {
    let app: Harness;
    const created: unknown[] = [];

    beforeAll(async () => {
      app = await startApp({
        configure: (builder) =>
          builder.overrideProvider(RedirectsService).useValue({
            list: async () => ({ items: [] }),
            create: async (_siteId: string, input: unknown) => {
              created.push(input);
              return {
                ...(input as Record<string, unknown>),
                createdAt: '2026-10-22T00:00:00.000Z',
                updatedAt: '2026-10-22T00:00:00.000Z',
              };
            },
            update: async (_siteId: string, input: unknown) => input,
            remove: async () => undefined,
          }),
      });
    });
    afterAll(async () => {
      await app.close();
    });

    it('lists the rules for the current site', async () => {
      const response = await app.request('/api/v1/redirects', {
        headers: withSession(app.token),
      });

      expect(response.status).toBe(200);
      expect(await readJson(response)).toEqual({ data: { items: [] } });
    });

    it('normalises the addresses the editor sends', async () => {
      const response = await app.request(
        '/api/v1/redirects',
        jsonRequest({ fromPath: 'promo-2025/', toPath: 'promotions' }, withSession(app.token)),
      );

      expect(response.status).toBe(201);
      expect(created[created.length - 1]).toEqual({
        fromPath: '/promo-2025',
        toPath: '/promotions',
        code: 301,
      });
    });

    it('refuses a rule that would send the home page away', async () => {
      const response = await app.request(
        '/api/v1/redirects',
        jsonRequest({ fromPath: '/', toPath: '/home' }, withSession(app.token)),
      );

      expect(response.status).toBe(400);
      expect((await readJson(response)).error).toBe('validation_error');
    });

    it('hides writing from a viewer', async () => {
      app.membership.role = 'viewer';
      const response = await app.request(
        '/api/v1/redirects',
        jsonRequest({ fromPath: '/a', toPath: '/b' }, withSession(app.token)),
      );
      app.membership.role = 'owner';

      expect(response.status).toBe(403);
    });
  });

  describe('deployment licence', () => {
    let app: Harness;
    const installed: string[] = [];
    const view = (plan: 'pro' | 'community') => ({
      edition: plan === 'pro' ? 'pro' : 'community',
      valid: plan === 'pro',
      plan,
      subject: plan === 'pro' ? 'บริษัท ตัวอย่าง จำกัด' : null,
      features: plan === 'pro' ? ['membership', 'marketplace'] : [],
      seats: plan === 'pro' ? 3 : null,
      issuedAt: '2026-10-30T00:00:00.000Z',
      expiresAt: null,
      reason: plan === 'pro' ? 'ok' : 'missing',
      mode: 'offline',
      bound: false,
      source: plan === 'pro' ? 'database' : 'none',
      installedAt: plan === 'pro' ? '2026-10-30T00:00:00.000Z' : null,
    });

    beforeAll(async () => {
      app = await startApp({
        configure: (builder) =>
          builder.overrideProvider(LicenseStore).useValue({
            view: () => view('community'),
            install: async (input: { token: string }) => {
              installed.push(input.token);
              return view('pro');
            },
            remove: async () => view('community'),
            onModuleInit: async () => undefined,
          }),
      });
    });
    afterAll(async () => {
      await app.close();
    });

    it('shows where the licence came from', async () => {
      const response = await app.request('/api/v1/license', {
        headers: withSession(app.token),
      });

      expect(response.status).toBe(200);
      expect(await readJson(response)).toMatchObject({
        data: { edition: 'community', source: 'none' },
      });
    });

    it('lets an owner install a licence', async () => {
      const response = await app.request(
        '/api/v1/license',
        jsonRequest({ token: 'lumio_lic_v1.abc.def' }, withSession(app.token), 'PATCH'),
      );

      expect(response.status).toBe(200);
      expect(installed[installed.length - 1]).toBe('lumio_lic_v1.abc.def');
      expect(await readJson(response)).toMatchObject({
        data: { edition: 'pro', source: 'database' },
      });
    });

    it('rejects an empty token before it reaches the store', async () => {
      installed.length = 0;
      const response = await app.request(
        '/api/v1/license',
        jsonRequest({ token: '   ' }, withSession(app.token), 'PATCH'),
      );

      expect(response.status).toBe(400);
      expect(installed).toHaveLength(0);
    });

    it('refuses an admin who is not the owner', async () => {
      app.membership.role = 'admin';
      const response = await app.request(
        '/api/v1/license',
        jsonRequest({ token: 'lumio_lic_v1.abc.def' }, withSession(app.token), 'PATCH'),
      );
      app.membership.role = 'owner';

      expect(response.status).toBe(403);
    });
  });

  describe('block marketplace', () => {
    const pair = generateKeyPairSync('ed25519');
    const publicKey = pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64');

    const installedPack = {
      key: 'lumio-launch',
      name: 'ชุดเปิดตัวเว็บ',
      version: '1.1.0',
      source: 'official' as const,
      enabled: true,
      sectionCount: 2,
      signed: false,
      installedAt: '2026-10-30T00:00:00.000Z',
      updatedAt: '2026-10-30T00:00:00.000Z',
    };

    const licence = (features: string[]): string => {
      const payload = { v: 1, sub: 'ทดสอบ', plan: 'pro', features, iat: 1_760_000_000 };
      const segment = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
      const signingInput = `lumio_lic_v1.${segment}`;
      const signature = sign(null, Buffer.from(signingInput, 'utf8'), pair.privateKey);
      return `${signingInput}.${signature.toString('base64url')}`;
    };

    let app: Harness;

    beforeAll(async () => {
      process.env.LUMIO_LICENSE_PUBLIC_KEY = publicKey;
      process.env.LUMIO_LICENSE = licence(['marketplace']);

      app = await startApp({
        siteFlags: { marketplace: true },
        configure: (builder) =>
          builder.overrideProvider(MarketplaceService).useValue({
            view: async () => ({ catalog: [], installed: [] }),
            sections: async () => [],
            install: async () => installedPack,
            setEnabled: async () => installedPack,
            remove: async () => undefined,
          }),
      });
    });

    afterAll(async () => {
      await app.close();
      delete process.env.LUMIO_LICENSE;
      delete process.env.LUMIO_LICENSE_PUBLIC_KEY;
      delete process.env.LUMIO_DISABLED_FEATURES;
    });

    it('serves the catalogue to a licensed site', async () => {
      const response = await app.request('/api/v1/marketplace', {
        headers: withSession(app.token),
      });

      expect(response.status).toBe(200);
      expect(await readJson(response)).toEqual({ data: { catalog: [], installed: [] } });
    });

    it('lets an editor read pack sections but not install one', async () => {
      app.membership.role = 'editor';
      const sections = await app.request('/api/v1/marketplace/sections', {
        headers: withSession(app.token),
      });
      const install = await app.request(
        '/api/v1/marketplace/installs',
        jsonRequest({ key: 'lumio-launch' }, withSession(app.token)),
      );
      app.membership.role = 'owner';

      expect(sections.status).toBe(200);
      expect(install.status).toBe(403);
    });

    it('installs a pack for an owner', async () => {
      const response = await app.request(
        '/api/v1/marketplace/installs',
        jsonRequest({ key: 'lumio-launch' }, withSession(app.token)),
      );

      expect(response.status).toBe(201);
      expect((await readJson(response)).data).toMatchObject({ key: 'lumio-launch' });
    });

    it('refuses the marketplace when the licence does not cover it', async () => {
      const previous = process.env.LUMIO_LICENSE;
      process.env.LUMIO_LICENSE = licence(['membership']);
      const response = await app.request('/api/v1/marketplace', {
        headers: withSession(app.token),
      });
      process.env.LUMIO_LICENSE = previous;

      expect(response.status).toBe(403);
    });

    it('refuses the marketplace when the platform closed it', async () => {
      process.env.LUMIO_DISABLED_FEATURES = 'marketplace';
      const response = await app.request('/api/v1/marketplace', {
        headers: withSession(app.token),
      });
      delete process.env.LUMIO_DISABLED_FEATURES;

      expect(response.status).toBe(403);
    });
  });
});

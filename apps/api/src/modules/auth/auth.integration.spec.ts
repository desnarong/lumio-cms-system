import type { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuditService } from '../audit/audit.service';
import { QuotaService } from '../billing/quota.service';
import { MembersService } from '../members/members.service';
import { PrismaService } from '../prisma/prisma.service';
import { InMemoryPublishQueue } from '../publish/publish.queue';
import { PublishService } from '../publish/publish.service';
import { SiteGuard } from '../site/site.guard';
import { SitesService } from '../sites/sites.service';
import { MemoryRateLimitStore } from '../../common/rate-limit.store';
import { AuthService, type AuthenticatedSession } from './auth.service';
import { LoginThrottleService } from './login-throttle.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

const OWNER_ID = '40000000-0000-4000-8000-000000000001';
const OUTSIDER_ID = '40000000-0000-4000-8000-000000000002';
const SITE_ID = '40000000-0000-4000-8000-0000000000a1';
const OWNER_EMAIL = 'auth-it-owner@lumio.test';
const PASSWORD = 'lumio-it-password-1';

const contextFor = (userId: string): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        headers: { 'x-site-id': SITE_ID },
        params: {},
        user: { id: userId, email: 'x@y.z' },
      }),
    }),
  }) as unknown as ExecutionContext;

/**
 * End-to-end check of the auth + site scoping stack against a real database.
 * Runs only when DATABASE_URL is set (CI provides a Postgres service, local runs
 * use docker compose).
 */
describe.skipIf(!process.env.DATABASE_URL)('Auth and site scoping', () => {
  let db: PrismaService;
  let auth: AuthService;
  let sites: SitesService;
  let members: MembersService;

  beforeAll(async () => {
    db = new PrismaService();
    await db.$connect();
    await db.site.deleteMany({ where: { id: SITE_ID } });
    await db.user.deleteMany({ where: { id: { in: [OWNER_ID, OUTSIDER_ID] } } });

    const passwordHash = await new PasswordService().hash(PASSWORD);
    await db.user.createMany({
      data: [
        { id: OWNER_ID, email: OWNER_EMAIL, name: 'เจ้าของทดสอบ', passwordHash },
        { id: OUTSIDER_ID, email: 'auth-it-outsider@lumio.test', name: 'คนนอก' },
      ],
    });
    await db.site.create({
      data: { id: SITE_ID, ownerId: OWNER_ID, name: 'เว็บทดสอบ auth', subdomain: 'auth-it-site' },
    });
    await db.forSite(SITE_ID, (tx) =>
      tx.siteMember.create({ data: { siteId: SITE_ID, userId: OWNER_ID, role: 'owner' } }),
    );

    const audit = new AuditService(db);
    auth = new AuthService(
      db,
      new PasswordService(),
      new TokenService(new JwtService({})),
      new LoginThrottleService(new MemoryRateLimitStore()),
    );
    sites = new SitesService(db, audit, new PublishService(new InMemoryPublishQueue(), db));
    members = new MembersService(db, audit, new QuotaService(db));
  });

  afterAll(async () => {
    await db.site.deleteMany({ where: { id: SITE_ID } });
    await db.user.deleteMany({ where: { id: { in: [OWNER_ID, OUTSIDER_ID] } } });
    await db.$disconnect();
  });

  it('logs in with the stored Argon2id hash and lists only the member sites', async () => {
    const session = (await auth.login({ email: OWNER_EMAIL, password: PASSWORD })) as AuthenticatedSession;
    expect(session.user.id).toBe(OWNER_ID);
    await expect(
      new TokenService(new JwtService({})).verifyAccess(session.accessToken),
    ).resolves.toMatchObject({ sub: OWNER_ID });

    const page = await sites.listForUser(OWNER_ID, { limit: 1 });
    expect(page.items.map((site) => site.id)).toContain(SITE_ID);
  });

  it('rejects a wrong password', async () => {
    await expect(
      auth.login({ email: OWNER_EMAIL, password: 'wrong-password' }),
    ).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('lets the owner in and keeps an outsider out of the site', async () => {
    const guard = new SiteGuard(db);
    await expect(guard.canActivate(contextFor(OWNER_ID))).resolves.toBe(true);
    await expect(guard.canActivate(contextFor(OUTSIDER_ID))).rejects.toMatchObject({
      code: 'forbidden',
    });
  });

  it('lists the members of the site', async () => {
    const page = await members.list(SITE_ID, { limit: 20 });
    expect(page.items.map((member) => member.userId)).toContain(OWNER_ID);
  });
});

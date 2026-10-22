import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ApiException } from '../../common/api-error';
import type { PrismaService } from '../prisma/prisma.service';
import { SiteGuard } from './site.guard';

const SITE_A = '00000000-0000-4000-8000-0000000000a1';
const SITE_B = '00000000-0000-4000-8000-0000000000a2';

interface RequestStub {
  headers: Record<string, string | undefined>;
  params?: Record<string, string | undefined>;
  user?: { id: string; email: string };
  siteId?: string;
  siteRole?: string;
}

const contextFor = (request: RequestStub): ExecutionContext =>
  ({ switchToHttp: () => ({ getRequest: () => request }) }) as unknown as ExecutionContext;

const dbWithMembership = (role: string | null): PrismaService =>
  ({
    forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) =>
      fn({ siteMember: { findFirst: vi.fn().mockResolvedValue(role ? { role } : null) } }),
    ),
  }) as unknown as PrismaService;

const member = { id: 'u1', email: 'owner@example.com' };

describe('SiteGuard', () => {
  it('resolves the site from the X-Site-Id header and attaches the role', async () => {
    const request: RequestStub = { headers: { 'x-site-id': SITE_A }, user: member };

    await expect(
      new SiteGuard(dbWithMembership('editor')).canActivate(contextFor(request)),
    ).resolves.toBe(true);
    expect(request.siteId).toBe(SITE_A);
    expect(request.siteRole).toBe('editor');
  });

  it('reads the site id from a route param', async () => {
    const request: RequestStub = { headers: {}, params: { id: SITE_A }, user: member };

    await expect(
      new SiteGuard(dbWithMembership('owner')).canActivate(contextFor(request)),
    ).resolves.toBe(true);
    expect(request.siteId).toBe(SITE_A);
  });

  it('blocks a user who is not a member of the requested site (cross-site access)', async () => {
    const request: RequestStub = { headers: { 'x-site-id': SITE_B }, user: member };

    await expect(
      new SiteGuard(dbWithMembership(null)).canActivate(contextFor(request)),
    ).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('requires a site id', async () => {
    const request: RequestStub = { headers: {}, user: member };

    await expect(
      new SiteGuard(dbWithMembership('owner')).canActivate(contextFor(request)),
    ).rejects.toMatchObject({ code: 'validation_error' });
  });

  it('rejects a malformed site id', async () => {
    const request: RequestStub = { headers: { 'x-site-id': 'not-a-uuid' }, user: member };

    await expect(
      new SiteGuard(dbWithMembership('owner')).canActivate(contextFor(request)),
    ).rejects.toMatchObject({ code: 'validation_error' });
  });

  it('rejects an unauthenticated request', async () => {
    const request: RequestStub = { headers: { 'x-site-id': SITE_A } };

    await expect(
      new SiteGuard(dbWithMembership('owner')).canActivate(contextFor(request)),
    ).rejects.toBeInstanceOf(ApiException);
  });
});

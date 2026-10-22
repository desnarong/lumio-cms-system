import { describe, expect, it, vi, type Mock } from 'vitest';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { QuotaService } from '../billing/quota.service';
import { MembersService } from './members.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const USER_ID = '00000000-0000-4000-8000-000000000001';
const JOINED_AT = new Date('2026-10-20T00:00:00Z');

const memberUser = {
  id: USER_ID,
  email: 'editor@example.com',
  name: 'ปิยะดา แสงทอง',
  avatarUrl: null,
};

interface AuditStub {
  log: Mock;
}

const auditStub = (): AuditStub => ({ log: vi.fn().mockResolvedValue(undefined) });

const quotaStub = (): QuotaService =>
  ({ assertCanAddMember: vi.fn().mockResolvedValue(undefined) }) as unknown as QuotaService;

describe('MembersService team quota', () => {
  it('checks the plan before inviting and refuses when the team is full', async () => {
    const quota = { assertCanAddMember: vi.fn().mockRejectedValue(new Error('เต็ม')) };
    const db = { user: { findUnique: vi.fn() } } as unknown as PrismaService;

    await expect(
      new MembersService(db, auditStub() as unknown as AuditService, quota as never).invite(
        SITE_ID,
        { email: 'editor@example.com', role: 'editor' },
        USER_ID,
      ),
    ).rejects.toThrow('เต็ม');
    expect(quota.assertCanAddMember).toHaveBeenCalledWith(SITE_ID);
  });
});

describe('MembersService', () => {
  it('lists members with their profile and role', async () => {
    const db = {
      forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) =>
        fn({
          siteMember: {
            findMany: vi
              .fn()
              .mockResolvedValue([{ role: 'editor', createdAt: JOINED_AT, user: memberUser }]),
          },
        }),
      ),
    } as unknown as PrismaService;

    const page = await new MembersService(db, auditStub() as unknown as AuditService, quotaStub()).list(
      SITE_ID,
      { limit: 20 },
    );

    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({ userId: USER_ID, role: 'editor' });
    expect(page.cursor).toBeNull();
  });

  it('invites an existing user and writes an audit log', async () => {
    const create = vi
      .fn()
      .mockResolvedValue({ role: 'editor', createdAt: JOINED_AT, user: memberUser });
    const db = {
      user: { findUnique: vi.fn().mockResolvedValue(memberUser) },
      forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) =>
        fn({ siteMember: { findUnique: vi.fn().mockResolvedValue(null), create } }),
      ),
    } as unknown as PrismaService;
    const audit = auditStub();

    const member = await new MembersService(
      db,
      audit as unknown as AuditService,
      quotaStub(),
    ).invite(
      SITE_ID,
      { email: 'editor@example.com', role: 'editor' },
      USER_ID,
    );

    expect(member).toMatchObject({ userId: USER_ID, role: 'editor' });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'member.invite' }));
  });

  it('rejects inviting an email that has no account', async () => {
    const db = {
      user: { findUnique: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;

    await expect(
      new MembersService(db, auditStub() as unknown as AuditService, quotaStub()).invite(
        SITE_ID,
        { email: 'ghost@example.com', role: 'editor' },
        USER_ID,
      ),
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it('rejects inviting someone who is already a member', async () => {
    const db = {
      user: { findUnique: vi.fn().mockResolvedValue(memberUser) },
      forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) =>
        fn({ siteMember: { findUnique: vi.fn().mockResolvedValue({ role: 'editor' }) } }),
      ),
    } as unknown as PrismaService;

    await expect(
      new MembersService(db, auditStub() as unknown as AuditService, quotaStub()).invite(
        SITE_ID,
        { email: 'editor@example.com', role: 'editor' },
        USER_ID,
      ),
    ).rejects.toMatchObject({ code: 'conflict' });
  });

  it('never hands out the owner role through the API', async () => {
    const db = { user: { findUnique: vi.fn() } } as unknown as PrismaService;

    await expect(
      new MembersService(db, auditStub() as unknown as AuditService, quotaStub()).invite(
        SITE_ID,
        { email: 'editor@example.com', role: 'owner' },
        USER_ID,
      ),
    ).rejects.toMatchObject({ code: 'validation_error' });
  });

  it('refuses to change or remove the owner', async () => {
    const db = {
      forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) =>
        fn({ siteMember: { findUnique: vi.fn().mockResolvedValue({ role: 'owner' }) } }),
      ),
    } as unknown as PrismaService;
    const service = new MembersService(db, auditStub() as unknown as AuditService, quotaStub());

    await expect(
      service.updateRole(SITE_ID, USER_ID, { role: 'admin' }, USER_ID),
    ).rejects.toMatchObject({ code: 'forbidden' });
    await expect(service.remove(SITE_ID, USER_ID, USER_ID)).rejects.toMatchObject({
      code: 'forbidden',
    });
  });

  it('reports a member that is not part of the site', async () => {
    const db = {
      forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) =>
        fn({ siteMember: { findUnique: vi.fn().mockResolvedValue(null) } }),
      ),
    } as unknown as PrismaService;

    await expect(
      new MembersService(db, auditStub() as unknown as AuditService, quotaStub()).remove(
        SITE_ID,
        USER_ID,
        USER_ID,
      ),
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});

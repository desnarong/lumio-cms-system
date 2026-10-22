import { describe, expect, it, vi, type Mock } from 'vitest';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { DomainVerifier } from './dns-verifier';
import { DomainsService } from './domains.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const USER_ID = '00000000-0000-4000-8000-000000000001';
const DOMAIN_ID = '00000000-0000-4000-8000-0000000000d1';

const row = (overrides: Record<string, unknown> = {}) => ({
  id: DOMAIN_ID,
  siteId: SITE_ID,
  hostname: 'baandoi.com',
  isPrimary: true,
  sslStatus: 'pending',
  verifiedAt: null,
  createdAt: new Date('2026-10-23T00:00:00Z'),
  updatedAt: new Date('2026-10-23T00:00:00Z'),
  ...overrides,
});

interface Stubs {
  db: PrismaService;
  create: Mock;
  remove: Mock;
  update: Mock;
  updateMany: Mock;
  auditLogCreate: Mock;
}

const stubs = (
  options: { rows?: unknown[]; existing?: unknown; site?: unknown } = {},
): Stubs => {
  const create = vi.fn().mockResolvedValue(row());
  const remove = vi.fn().mockResolvedValue({});
  const update = vi.fn().mockResolvedValue(row({ verifiedAt: new Date(), sslStatus: 'active' }));
  const updateMany = vi.fn().mockResolvedValue({});
  const auditLogCreate = vi.fn().mockResolvedValue({});

  const tx = {
    domain: {
      findMany: vi.fn().mockResolvedValue(options.rows ?? [row()]),
      findUnique: vi.fn().mockResolvedValue(options.existing ?? row()),
      create,
      update,
      updateMany,
      delete: remove,
    },
    auditLog: { create: auditLogCreate },
  };

  const db = {
    forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx)),
    site: {
      findUnique: vi
        .fn()
        .mockResolvedValue(options.site === undefined ? { subdomain: 'baandoi' } : options.site),
    },
    domain: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
  } as unknown as PrismaService;

  return { db, create, remove, update, updateMany, auditLogCreate };
};

const service = (all: Stubs, resolves = true): DomainsService =>
  new DomainsService(
    all.db,
    { log: vi.fn().mockResolvedValue(undefined) } as unknown as AuditService,
    { resolves: vi.fn().mockResolvedValue(resolves) } as unknown as DomainVerifier,
  );

describe('DomainsService', () => {
  it('lists domains with the free address to point at', async () => {
    const result = await service(stubs()).list(SITE_ID);

    expect(result.cnameTarget).toBe('baandoi.example.com');
    expect(result.items[0]).toMatchObject({ hostname: 'baandoi.com', sslStatus: 'pending' });
  });

  it('rejects a domain that is already taken', async () => {
    const all = stubs();
    (all.db.domain.findUnique as Mock).mockResolvedValue({ id: 'other' });

    await expect(
      service(all).add(SITE_ID, { hostname: 'taken.com', isPrimary: false }, USER_ID),
    ).rejects.toMatchObject({ code: 'conflict' });
  });

  it('refuses the site’s own free address', async () => {
    await expect(
      service(stubs()).add(SITE_ID, { hostname: 'baandoi.example.com', isPrimary: false }, USER_ID),
    ).rejects.toMatchObject({ code: 'validation_error' });
  });

  it('adds a domain and clears the previous primary', async () => {
    const all = stubs();

    await service(all).add(SITE_ID, { hostname: 'baandoi.com', isPrimary: true }, USER_ID);

    expect(all.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isPrimary: true } }),
    );
    expect(all.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ siteId: SITE_ID, hostname: 'baandoi.com' }),
      }),
    );
  });

  it('keeps a domain pending when DNS does not point at the site yet', async () => {
    const result = await service(stubs(), false).verify(SITE_ID, DOMAIN_ID, USER_ID);

    expect(result.verified).toBe(false);
    expect(result.domain.sslStatus).toBe('pending');
  });

  it('activates a domain once DNS resolves and records it', async () => {
    const all = stubs();
    const result = await service(all, true).verify(SITE_ID, DOMAIN_ID, USER_ID);

    expect(result.verified).toBe(true);
    expect(result.domain.sslStatus).toBe('active');
    expect(all.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'domain.verify' }) }),
    );
  });

  it('activates a pending domain automatically once DNS resolves', async () => {
    const all = stubs();
    (all.db.domain.findMany as Mock).mockResolvedValue([
      { id: DOMAIN_ID, siteId: SITE_ID, hostname: 'baandoi.com' },
    ]);

    const activated = await service(all, true).autoVerify();

    expect(activated).toBe(1);
    expect(all.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: DOMAIN_ID },
        data: expect.objectContaining({ sslStatus: 'active' }),
      }),
    );
    expect(all.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'domain.verify.auto' }),
      }),
    );
  });

  it('leaves a domain pending while DNS still points elsewhere', async () => {
    const all = stubs();
    (all.db.domain.findMany as Mock).mockResolvedValue([
      { id: DOMAIN_ID, siteId: SITE_ID, hostname: 'baandoi.com' },
    ]);

    const activated = await service(all, false).autoVerify();

    expect(activated).toBe(0);
    expect(all.update).not.toHaveBeenCalled();
  });

  it('removes a domain', async () => {
    const all = stubs();
    await service(all).remove(SITE_ID, DOMAIN_ID, USER_ID);

    expect(all.remove).toHaveBeenCalledWith({ where: { id: DOMAIN_ID } });
  });
});

describe('DomainsService TLS ask', () => {
  it('allows a verified, active hostname after normalising it', async () => {
    const all = stubs();
    (all.db.domain.findUnique as Mock).mockResolvedValue({
      sslStatus: 'active',
      verifiedAt: new Date('2026-10-23T00:00:00Z'),
    });

    await expect(service(all).canIssueCertificate('BaanDoi.com.')).resolves.toBe(true);
    expect(all.db.domain.findUnique).toHaveBeenCalledWith({
      where: { hostname: 'baandoi.com' },
      select: { sslStatus: true, verifiedAt: true },
    });
  });

  it('refuses a hostname that has not finished DNS verification', async () => {
    const all = stubs();
    (all.db.domain.findUnique as Mock).mockResolvedValue({
      sslStatus: 'pending',
      verifiedAt: null,
    });

    await expect(service(all).canIssueCertificate('baandoi.com')).resolves.toBe(false);
  });

  it('refuses unknown and empty hostnames', async () => {
    const all = stubs();
    (all.db.domain.findUnique as Mock).mockResolvedValue(null);

    await expect(service(all).canIssueCertificate('unknown.com')).resolves.toBe(false);
    await expect(service(all).canIssueCertificate('')).resolves.toBe(false);
    expect(all.db.domain.findUnique).toHaveBeenCalledTimes(1);
  });
});

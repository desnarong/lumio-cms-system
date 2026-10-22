import { describe, expect, it, vi, type Mock } from 'vitest';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import { RedirectsService } from './redirects.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const USER_ID = '00000000-0000-4000-8000-000000000001';

const row = (overrides: Record<string, unknown> = {}) => ({
  siteId: SITE_ID,
  fromPath: '/old-promo',
  toPath: '/promotions',
  code: 301,
  createdAt: new Date('2026-10-22T00:00:00Z'),
  updatedAt: new Date('2026-10-22T00:00:00Z'),
  ...overrides,
});

interface Stubs {
  db: PrismaService;
  findMany: Mock;
  findUnique: Mock;
  create: Mock;
  update: Mock;
  remove: Mock;
  auditLogCreate: Mock;
}

const stubs = (
  options: { rows?: unknown[]; existing?: unknown } = {},
): Stubs => {
  const findMany = vi.fn().mockResolvedValue(options.rows ?? [row()]);
  const findUnique = vi.fn().mockResolvedValue(options.existing ?? null);
  const create = vi.fn().mockResolvedValue(row());
  const update = vi.fn().mockResolvedValue(row({ toPath: '/new', code: 302 }));
  const remove = vi.fn().mockResolvedValue({});
  const auditLogCreate = vi.fn().mockResolvedValue({});

  const tx = {
    redirect: { findMany, findUnique, create, update, delete: remove },
    auditLog: { create: auditLogCreate },
  };

  const db = {
    forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx)),
  } as unknown as PrismaService;

  return { db, findMany, findUnique, create, update, remove, auditLogCreate };
};

const service = (all: Stubs): RedirectsService =>
  new RedirectsService(all.db, { log: vi.fn() } as unknown as AuditService);

describe('RedirectsService', () => {
  it('lists the rules of the current site', async () => {
    const all = stubs();

    const result = await service(all).list(SITE_ID);

    expect(all.db.forSite).toHaveBeenCalledWith(SITE_ID, expect.any(Function));
    expect(result.items[0]).toMatchObject({ fromPath: '/old-promo', code: 301 });
  });

  it('falls back to a permanent redirect when the stored code is unknown', async () => {
    const all = stubs({ rows: [row({ code: 307 })] });

    const result = await service(all).list(SITE_ID);

    expect(result.items[0]?.code).toBe(301);
  });

  it('adds a rule and records who changed it', async () => {
    const all = stubs();

    const created = await service(all).create(
      SITE_ID,
      { fromPath: '/old-promo/', toPath: '/promotions', code: 301 },
      USER_ID,
    );

    expect(all.create).toHaveBeenCalledWith({
      data: { siteId: SITE_ID, fromPath: '/old-promo', toPath: '/promotions', code: 301 },
    });
    expect(all.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'redirect.create', target: '/old-promo' }),
      }),
    );
    expect(created.fromPath).toBe('/old-promo');
  });

  it('refuses a second rule for the same old address', async () => {
    const all = stubs({ existing: row() });

    await expect(
      service(all).create(SITE_ID, { fromPath: '/old-promo', toPath: '/b', code: 301 }, USER_ID),
    ).rejects.toMatchObject({ code: 'conflict' });
    expect(all.create).not.toHaveBeenCalled();
  });

  it('updates where a rule points', async () => {
    const all = stubs({ existing: { fromPath: '/old-promo' } });

    const updated = await service(all).update(
      SITE_ID,
      { fromPath: '/old-promo', toPath: '/new', code: 302 },
      USER_ID,
    );

    expect(all.update).toHaveBeenCalledWith({
      where: { siteId_fromPath: { siteId: SITE_ID, fromPath: '/old-promo' } },
      data: { toPath: '/new', code: 302 },
    });
    expect(all.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'redirect.update' }),
      }),
    );
    expect(updated).toMatchObject({ toPath: '/new', code: 302 });
  });

  it('404s when the rule to edit is gone', async () => {
    const all = stubs({ existing: null });

    await expect(
      service(all).update(SITE_ID, { fromPath: '/missing', toPath: '/new', code: 301 }, USER_ID),
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it('removes a rule by its old address', async () => {
    const all = stubs({ existing: row() });

    await service(all).remove(SITE_ID, '/old-promo/', USER_ID);

    expect(all.remove).toHaveBeenCalledWith({
      where: { siteId_fromPath: { siteId: SITE_ID, fromPath: '/old-promo' } },
    });
    expect(all.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'redirect.remove', target: '/old-promo' }),
      }),
    );
  });

  it('refuses to delete without an address or the home page', async () => {
    const all = stubs();

    await expect(service(all).remove(SITE_ID, undefined, USER_ID)).rejects.toMatchObject({
      code: 'validation_error',
    });
    await expect(service(all).remove(SITE_ID, '  ', USER_ID)).rejects.toMatchObject({
      code: 'validation_error',
    });
    await expect(service(all).remove(SITE_ID, '/', USER_ID)).rejects.toMatchObject({
      code: 'validation_error',
    });
    expect(all.remove).not.toHaveBeenCalled();
  });

  it('404s when deleting a rule that does not exist', async () => {
    const all = stubs({ existing: null });

    await expect(service(all).remove(SITE_ID, '/missing', USER_ID)).rejects.toMatchObject({
      code: 'not_found',
    });
  });
});

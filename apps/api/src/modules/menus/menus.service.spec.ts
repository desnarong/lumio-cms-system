import { describe, expect, it, vi, type Mock } from 'vitest';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import { MenusService } from './menus.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const USER_ID = '00000000-0000-4000-8000-000000000001';

interface Stubs {
  db: PrismaService;
  findFirst: Mock;
  create: Mock;
  update: Mock;
  auditLogCreate: Mock;
}

/**
 * A menu is keyed by (site, location, locale). These stubs let a test say
 * whether a row already exists for that key: `null` means the update path
 * creates one, a row means it is updated in place.
 */
const stubs = (row: unknown = null): Stubs => {
  const findFirst = vi.fn().mockResolvedValue(row);
  const echo = async ({ data }: { data: Record<string, unknown> }) => ({
    items: data.items,
    locale: (data.locale as string | null) ?? null,
    updatedAt: new Date('2026-10-23T00:00:00Z'),
  });
  const create = vi.fn(echo);
  const update = vi.fn(echo);
  const auditLogCreate = vi.fn().mockResolvedValue({});

  const db = {
    site: { findUnique: vi.fn().mockResolvedValue(null) },
    forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) =>
      fn({
        menu: { findFirst, create, update },
        auditLog: { create: auditLogCreate },
      }),
    ),
  } as unknown as PrismaService;

  return { db, findFirst, create, update, auditLogCreate };
};

const service = (all: Stubs): MenusService =>
  new MenusService(all.db, {
    log: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuditService);

describe('MenusService', () => {
  it('returns an empty menu when the site has none yet', async () => {
    const menu = await service(stubs()).get(SITE_ID, 'header');

    expect(menu.items).toEqual([]);
    expect(menu.location).toBe('header');
    expect(menu.locale).toBeNull();
  });

  it('reads stored items and drops anything malformed', async () => {
    const row = {
      items: [{ label: 'หน้าแรก', href: '/', children: [] }, { href: '/no-label' }],
      locale: null,
      updatedAt: new Date('2026-10-23T00:00:00Z'),
    };

    const menu = await service(stubs(row)).get(SITE_ID, 'footer');

    expect(menu.items).toHaveLength(1);
    expect(menu.items[0]?.label).toBe('หน้าแรก');
  });

  it('creates the menu for the location and writes an audit log', async () => {
    const all = stubs(null);

    const menu = await service(all).update(
      SITE_ID,
      'header',
      { items: [{ label: 'หน้าแรก', href: '/', children: [] }] },
      USER_ID,
    );

    expect(all.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { location: 'header', locale: null } }),
    );
    expect(all.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ location: 'header', locale: null }),
      }),
    );
    expect(all.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'menu.update' }) }),
    );
    expect(menu.items[0]?.label).toBe('หน้าแรก');
  });

  it('updates the existing row instead of creating a second one', async () => {
    const all = stubs({ id: 'menu-1' });

    await service(all).update(
      SITE_ID,
      'header',
      { items: [{ label: 'หน้าแรก', href: '/', children: [] }] },
      USER_ID,
    );

    expect(all.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'menu-1' } }));
    expect(all.create).not.toHaveBeenCalled();
  });

  it('keeps a language-specific menu apart from the shared one', async () => {
    const all = stubs(null);

    const menu = await service(all).update(
      SITE_ID,
      'header',
      { items: [{ label: 'Home', href: '/en', children: [] }], locale: 'en' },
      USER_ID,
    );

    expect(all.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { location: 'header', locale: 'en' } }),
    );
    expect(all.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ locale: 'en' }) }),
    );
    expect(all.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ target: 'header:en' }) }),
    );
    expect(menu.locale).toBe('en');
  });

  it('reads the menu for the requested language', async () => {
    const all = stubs({ items: [], locale: 'en', updatedAt: new Date('2026-10-23T00:00:00Z') });

    const menu = await service(all).get(SITE_ID, 'header', 'EN');

    expect(all.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { location: 'header', locale: 'en' } }),
    );
    expect(menu.locale).toBe('en');
  });

  it('keeps nested menu items', async () => {
    const all = stubs(null);

    await service(all).update(
      SITE_ID,
      'header',
      {
        items: [
          {
            label: 'บริการ',
            children: [{ label: 'จัดฟัน', href: '/services/braces', children: [] }],
          },
        ],
      },
      USER_ID,
    );

    const [args] = all.create.mock.calls[0] as [{ data: { items: unknown[] } }];
    expect(JSON.stringify(args.data.items)).toContain('จัดฟัน');
  });
});
import { describe, expect, it, vi, type Mock } from 'vitest';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import { AppsService } from './apps.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const USER_ID = '00000000-0000-4000-8000-000000000001';

const siteAppRow = (overrides: Record<string, unknown> = {}) => ({
  siteId: SITE_ID,
  appKey: 'seo-booster',
  config: {},
  enabled: true,
  createdAt: new Date('2026-10-10T10:00:00Z'),
  updatedAt: new Date('2026-10-10T10:00:00Z'),
  ...overrides,
});

interface Stubs {
  db: PrismaService;
  auditLogCreate: Mock;
  create: Mock;
  update: Mock;
  delete: Mock;
}

const stubs = (options: { rows?: unknown[]; existing?: unknown } = {}): Stubs => {
  const auditLogCreate = vi.fn().mockResolvedValue({});
  const create = vi.fn().mockResolvedValue(siteAppRow());
  const update = vi.fn().mockResolvedValue(siteAppRow({ enabled: false }));
  const remove = vi.fn().mockResolvedValue({});

  const tx = {
    siteApp: {
      findMany: vi.fn().mockResolvedValue(options.rows ?? []),
      findUnique: vi.fn().mockResolvedValue(options.existing ?? null),
      create,
      update,
      delete: remove,
    },
    auditLog: { create: auditLogCreate },
  };

  const db = {
    forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx)),
  } as unknown as PrismaService;

  return { db, auditLogCreate, create, update, delete: remove };
};

const service = (all: Stubs, manifests?: { preview: Mock }): AppsService =>
  new AppsService(
    all.db,
    { log: vi.fn() } as unknown as AuditService,
    (manifests ?? { preview: vi.fn() }) as never,
  );

describe('AppsService', () => {
  it('marks which catalog apps this site already has', async () => {
    const all = stubs({ rows: [siteAppRow({ appKey: 'google-analytics', enabled: false })] });
    const store = await service(all).store(SITE_ID);

    const analytics = store.find((app) => app.key === 'google-analytics');
    const seo = store.find((app) => app.key === 'seo-booster');
    expect(analytics).toMatchObject({ installed: true, enabled: false });
    expect(seo).toMatchObject({ installed: false, enabled: false });
  });

  it('installs a catalog app and records it', async () => {
    const all = stubs();
    const installed = await service(all).install(SITE_ID, 'seo-booster', { config: {} }, USER_ID);

    expect(installed.key).toBe('seo-booster');
    expect(installed.name).toBe('ตัวช่วย SEO');
    expect(installed.permissions).toContain('analytics:read');
    expect(all.auditLogCreate).toHaveBeenCalledOnce();
  });

  it('answers the App store in English while keeping the same scopes', async () => {
    const all = stubs();
    const store = await service(all).store(SITE_ID, 'en');
    const seo = store.find((app) => app.key === 'seo-booster');

    expect(seo?.name).toBe('SEO helper');
    expect(seo?.description).toContain('Checks every page');
    expect(seo?.permissions).toEqual(['contents:read', 'contents:write:own', 'analytics:read']);
  });

  it('refuses an unknown app and an app that is already installed', async () => {
    await expect(
      service(stubs()).install(SITE_ID, 'does-not-exist', { config: {} }, USER_ID),
    ).rejects.toMatchObject({ code: 'not_found' });

    const already = stubs({ existing: { siteId: SITE_ID } });
    await expect(
      service(already).install(SITE_ID, 'seo-booster', { config: {} }, USER_ID),
    ).rejects.toMatchObject({ code: 'conflict' });
    expect(already.create).not.toHaveBeenCalled();
  });

  it('enables and disables an installed app', async () => {
    const all = stubs({ existing: { appKey: 'seo-booster' } });
    const updated = await service(all).update(SITE_ID, 'seo-booster', { enabled: false }, USER_ID);

    expect(updated.enabled).toBe(false);
    expect(all.auditLogCreate).toHaveBeenCalledOnce();
  });

  it('refuses to update an app that is not installed', async () => {
    await expect(
      service(stubs()).update(SITE_ID, 'seo-booster', { enabled: true }, USER_ID),
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it('uninstalls an app and records it', async () => {
    const all = stubs({ existing: { appKey: 'seo-booster' } });
    await service(all).remove(SITE_ID, 'seo-booster', USER_ID);

    expect(all.delete).toHaveBeenCalledOnce();
    expect(all.auditLogCreate).toHaveBeenCalledOnce();
  });
});

describe('AppsService external manifests', () => {
  const manifest = {
    key: 'booking-widget',
    name: 'Booking',
    description: 'Takes bookings',
    version: '1.0.0',
    permissions: ['contents:read'] as const,
    category: 'content' as const,
    entry: 'https://apps.example.com/admin/index.html',
  };

  const preview = {
    manifestUrl: 'https://apps.example.com/manifest.json',
    entry: 'https://apps.example.com/admin/index.html',
    manifest,
  };

  it('installs from a developer manifest and keeps it for later loads', async () => {
    const all = stubs();
    all.create.mockResolvedValueOnce(
      siteAppRow({
        appKey: 'booking-widget',
        source: 'external',
        manifestUrl: preview.manifestUrl,
        manifest,
      }),
    );
    const manifests = { preview: vi.fn().mockResolvedValue(preview) };

    const installed = await service(all, manifests).installExternal(
      SITE_ID,
      { url: preview.manifestUrl },
      USER_ID,
    );

    expect(manifests.preview).toHaveBeenCalledWith(preview.manifestUrl);
    expect(all.create.mock.calls[0]?.[0]?.data).toMatchObject({
      appKey: 'booking-widget',
      source: 'external',
      manifestUrl: preview.manifestUrl,
      manifest,
    });
    expect(installed).toMatchObject({
      key: 'booking-widget',
      source: 'external',
      entry: 'https://apps.example.com/admin/index.html',
      permissions: ['contents:read'],
    });
  });

  it('refuses a manifest key that belongs to the built-in catalog', async () => {
    const all = stubs();
    const manifests = {
      preview: vi.fn().mockResolvedValue({
        ...preview,
        manifest: { ...manifest, key: 'seo-booster' },
      }),
    };

    await expect(
      service(all, manifests).installExternal(SITE_ID, { url: preview.manifestUrl }, USER_ID),
    ).rejects.toMatchObject({ code: 'conflict' });
    expect(all.create).not.toHaveBeenCalled();
  });

  it('shows external Apps in the store after install', async () => {
    const all = stubs({
      rows: [siteAppRow({ appKey: 'booking-widget', source: 'external', manifest })],
    });
    const store = await service(all).store(SITE_ID);
    const external = store.find((app) => app.key === 'booking-widget');

    expect(external).toMatchObject({
      source: 'external',
      installed: true,
      entry: 'https://apps.example.com/admin/index.html',
    });
  });

  it('honours the platform kill switch', async () => {
    process.env.APPS_PLATFORM_DISABLED = 'true';
    try {
      const all = stubs();
      await expect(
        service(all).install(SITE_ID, 'seo-booster', { config: {} }, USER_ID),
      ).rejects.toMatchObject({ code: 'forbidden' });
      await expect(
        service(all, { preview: vi.fn() }).installExternal(
          SITE_ID,
          { url: preview.manifestUrl },
          USER_ID,
        ),
      ).rejects.toMatchObject({ code: 'forbidden' });
      expect(all.create).not.toHaveBeenCalled();
    } finally {
      delete process.env.APPS_PLATFORM_DISABLED;
    }
  });
});

import { describe, expect, it, vi, type Mock } from 'vitest';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { PublishService } from '../publish/publish.service';
import { SitesService } from './sites.service';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const SITE_ID = '00000000-0000-4000-8000-0000000000a1';

const siteRow = (overrides: Record<string, unknown> = {}) => ({
  id: SITE_ID,
  ownerId: USER_ID,
  name: 'กาแฟบ้านดอย',
  subdomain: 'baandoi',
  localeDefault: 'th',
  locales: ['th'],
  templateId: null,
  themeTokens: {},
  settings: {},
  plan: 'free',
  createdAt: new Date('2026-10-20T00:00:00Z'),
  updatedAt: new Date('2026-10-20T00:00:00Z'),
  ...overrides,
});

interface AuditStub {
  log: Mock;
}

interface PublishStub {
  enqueuePage: Mock;
  enqueueSite: Mock;
  enqueueChrome: Mock;
  primaryHost: Mock;
}

const auditStub = (): AuditStub => ({ log: vi.fn().mockResolvedValue(undefined) });

const publishStub = (): PublishStub => ({
  enqueuePage: vi.fn().mockResolvedValue({}),
  enqueueSite: vi.fn().mockResolvedValue({}),
  enqueueChrome: vi.fn().mockResolvedValue({}),
  primaryHost: vi.fn().mockResolvedValue(null),
});

const service = (
  db: PrismaService,
  audit: AuditStub = auditStub(),
  publish: PublishStub = publishStub(),
): SitesService =>
  new SitesService(db, audit as unknown as AuditService, publish as unknown as PublishService);

describe('SitesService', () => {
  it('lists the sites the user belongs to with their role', async () => {
    const db = {
      forUser: vi.fn(async (_userId: string, fn: (tx: unknown) => unknown) =>
        fn({
          siteMember: { findMany: vi.fn().mockResolvedValue([{ role: 'owner', site: siteRow() }]) },
        }),
      ),
    } as unknown as PrismaService;

    const page = await service(db).listForUser(USER_ID, { limit: 20 });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({ id: SITE_ID, role: 'owner' });
    expect(page.cursor).toBeNull();
  });

  it('returns a cursor when there are more sites than the page size', async () => {
    const rows = [
      { role: 'owner', site: siteRow() },
      { role: 'editor', site: siteRow({ id: '00000000-0000-4000-8000-0000000000a2' }) },
    ];
    const db = {
      forUser: vi.fn(async (_userId: string, fn: (tx: unknown) => unknown) =>
        fn({ siteMember: { findMany: vi.fn().mockResolvedValue(rows) } }),
      ),
    } as unknown as PrismaService;

    const page = await service(db).listForUser(USER_ID, { limit: 1 });

    expect(page.items).toHaveLength(1);
    expect(page.cursor).toBe(SITE_ID);
  });

  it('hides a site that does not exist', async () => {
    const db = {
      forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) =>
        fn({ site: { findUnique: vi.fn().mockResolvedValue(null) } }),
      ),
    } as unknown as PrismaService;

    await expect(service(db).get(SITE_ID, 'owner')).rejects.toMatchObject({ code: 'not_found' });
  });

  it('publishes every draft, records the count and queues a full rebuild', async () => {
    const contentUpdate = vi.fn().mockResolvedValue({});
    const auditLogCreate = vi.fn().mockResolvedValue({});
    const db = {
      forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) =>
        fn({
          content: {
            findMany: vi.fn().mockResolvedValue([{ id: 'c1', blocksDraft: [], revision: 3 }]),
            update: contentUpdate,
          },
          auditLog: { create: auditLogCreate },
        }),
      ),
    } as unknown as PrismaService;
    const publish = publishStub();

    const result = await service(db, auditStub(), publish).publishAll(SITE_ID, USER_ID);

    expect(result).toEqual({ published: 1 });
    expect(contentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'published', revision: 4 }),
      }),
    );
    expect(auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'site.publish_all' }) }),
    );
    expect(publish.enqueueSite).toHaveBeenCalledWith(SITE_ID);
  });

  it('keeps the language list normalised, deduped and default-first', async () => {
    const siteUpdate = vi.fn().mockResolvedValue(siteRow({ locales: ['th', 'en'] }));
    const db = {
      forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) =>
        fn({
          site: { findUnique: vi.fn().mockResolvedValue(siteRow()), update: siteUpdate },
          auditLog: { create: vi.fn().mockResolvedValue({}) },
        }),
      ),
    } as unknown as PrismaService;

    await service(db).update(SITE_ID, { locales: ['en', 'th', 'en'] }, USER_ID, 'owner');

    expect(siteUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ locales: ['th', 'en'] }) }),
    );
  });

  it('adds the default language back when the list omits it', async () => {
    const siteUpdate = vi.fn().mockResolvedValue(siteRow());
    const db = {
      forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) =>
        fn({
          site: { findUnique: vi.fn().mockResolvedValue(siteRow()), update: siteUpdate },
          auditLog: { create: vi.fn().mockResolvedValue({}) },
        }),
      ),
    } as unknown as PrismaService;

    await service(db).update(SITE_ID, { locales: ['en'] }, USER_ID, 'owner');

    expect(siteUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ locales: ['th', 'en'] }) }),
    );
  });

  it('stores a brand image and answers with the resolved favicon URL', async () => {
    const faviconId = '00000000-0000-4000-8000-0000000000b2';
    const siteUpdate = vi
      .fn()
      .mockResolvedValue(siteRow({ settings: { faviconMediaId: faviconId } }));
    const db = {
      forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) =>
        fn({
          site: { findUnique: vi.fn().mockResolvedValue(siteRow()), update: siteUpdate },
          media: {
            findFirst: vi.fn().mockResolvedValue({ id: faviconId, status: 'ready' }),
            findMany: vi.fn().mockResolvedValue([
              { id: faviconId, storageKey: 'brand/icon.png', variants: [], status: 'ready' },
            ]),
          },
          content: {
            findMany: vi.fn().mockResolvedValue([
              { type: 'page', slug: 'home', locale: 'th' },
              { type: 'page', slug: 'about', locale: 'th' },
            ]),
          },
          auditLog: { create: vi.fn().mockResolvedValue({}) },
        }),
      ),
    } as unknown as PrismaService;
    const publish = publishStub();

    const summary = await service(db, auditStub(), publish).update(
      SITE_ID,
      { settings: { faviconMediaId: faviconId } },
      USER_ID,
      'owner',
    );

    expect(summary.faviconUrl).toBe('http://localhost:49100/media/brand/icon.png');
    expect(publish.enqueueChrome).toHaveBeenCalledWith(SITE_ID);
  });

  it('refuses a brand image that is not in the library of this site', async () => {
    const db = {
      forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) =>
        fn({
          site: { findUnique: vi.fn().mockResolvedValue(siteRow()) },
          media: { findFirst: vi.fn().mockResolvedValue(null) },
          auditLog: { create: vi.fn().mockResolvedValue({}) },
        }),
      ),
    } as unknown as PrismaService;

    await expect(
      service(db).update(
        SITE_ID,
        { settings: { logoMediaId: '00000000-0000-4000-8000-0000000000ff' } },
        USER_ID,
        'owner',
      ),
    ).rejects.toMatchObject({ code: 'validation_error' });
  });

  it('lets a site save its own unchanged subdomain', async () => {
    const db = {
      site: { findFirst: vi.fn().mockResolvedValue(null) },
      forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) =>
        fn({
          site: {
            findUnique: vi.fn().mockResolvedValue(siteRow()),
            update: vi.fn().mockResolvedValue(siteRow()),
          },
          auditLog: { create: vi.fn().mockResolvedValue({}) },
        }),
      ),
    } as unknown as PrismaService;

    const summary = await service(db).update(
      SITE_ID,
      { name: 'กาแฟบ้านดอย', subdomain: 'baandoi' },
      USER_ID,
      'owner',
    );

    expect(summary.subdomain).toBe('baandoi');
    expect(db.site.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { subdomain: 'baandoi', id: { not: SITE_ID } } }),
    );
  });

  it('refuses a subdomain another site already uses', async () => {
    const db = {
      site: {
        findFirst: vi.fn().mockResolvedValue({ id: '00000000-0000-4000-8000-0000000000ff' }),
      },
    } as unknown as PrismaService;

    await expect(
      service(db).update(SITE_ID, { subdomain: 'baandoi' }, USER_ID, 'owner'),
    ).rejects.toMatchObject({ code: 'conflict' });
  });
});

import { describe, expect, it, vi, type Mock } from 'vitest';
import { SITE_EXPORT_VERSION, type SiteImportInput } from '@lumio/shared';
import type { MediaService } from '../media/media.service';
import type { MediaStorage } from '../media/media.storage';
import type { PrismaService } from '../prisma/prisma.service';
import { BackupService } from './backup.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';

const importInput = (overrides: Partial<SiteImportInput> = {}): SiteImportInput => ({
  version: SITE_EXPORT_VERSION,
  exportedAt: '2026-10-21T00:00:00.000Z',
  site: {
    name: 'กาแฟบ้านดอย',
    subdomain: 'baandoi',
    localeDefault: 'th',
    locales: ['th'],
    plan: 'free',
    themeTokens: {},
    settings: {},
  },
  contents: [],
  menus: [],
  globalBlocks: [],
  sectionTemplates: [],
  forms: [],
  subscribers: [],
  domains: [],
  members: [],
  media: [],
  ...overrides,
  products: overrides.products ?? [],
  orders: overrides.orders ?? [],
});

interface Stubs {
  db: PrismaService;
  contentCreate: Mock;
  subscriberCreateMany: Mock;
  audit: Mock;
  domainCreateMany: Mock;
  domainUpdateMany: Mock;
  memberCreate: Mock;
  globalBlockCreate: Mock;
  globalBlockUpdate: Mock;
}

const stubs = (
  options: {
    existingContentSlugs?: string[];
    subscribersCreated?: number;
    mediaRows?: unknown[];
    takenHostnames?: string[];
    users?: { id: string; email: string }[];
    existingMemberIds?: string[];
    globalKinds?: string[];
  } = {},
): Stubs => {
  const existing = new Set(options.existingContentSlugs ?? []);
  const contentCreate = vi.fn().mockResolvedValue({ id: 'c-new' });
  const subscriberCreateMany = vi
    .fn()
    .mockResolvedValue({ count: options.subscribersCreated ?? 0 });
  const audit = vi.fn();
  const domainCreateMany = vi.fn().mockResolvedValue({ count: 1 });
  const domainUpdateMany = vi.fn().mockResolvedValue({ count: 0 });
  const memberCreate = vi.fn().mockResolvedValue({});
  const globalBlockCreate = vi.fn().mockResolvedValue({});
  const globalBlockUpdate = vi.fn().mockResolvedValue({});
  const takenHostnames = new Set(options.takenHostnames ?? []);
  const existingMemberIds = new Set(options.existingMemberIds ?? []);
  const globalKinds = new Set(options.globalKinds ?? []);

  const tx = {
    site: {
      findUnique: vi.fn(async () => ({
        id: SITE_ID,
        name: 'กาแฟบ้านดอย',
        subdomain: 'baandoi',
        localeDefault: 'th',
        locales: ['th'],
        plan: 'free',
        themeTokens: {},
        settings: {},
      })),
    },
    content: {
      findUnique: vi.fn(async ({ where }: { where: { siteId_locale_type_slug: { slug: string } } }) =>
        existing.has(where.siteId_locale_type_slug.slug) ? { id: 'c-old' } : null,
      ),
      create: contentCreate,
      findMany: vi.fn(async () => []),
    },
    menu: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}), update: vi.fn().mockResolvedValue({}), findMany: vi.fn(async () => []) },
    globalBlock: {
      create: globalBlockCreate,
      update: globalBlockUpdate,
      findFirst: vi.fn(async ({ where }: { where: { kind: string } }) =>
        globalKinds.has(where.kind) ? { id: `g-${where.kind}` } : null,
      ),
      findMany: vi.fn(async () => []),
    },
    sectionTemplate: { create: vi.fn().mockResolvedValue({}), findMany: vi.fn(async () => []) },
    form: { create: vi.fn().mockResolvedValue({}), findMany: vi.fn(async () => []) },
    subscriber: { createMany: subscriberCreateMany, findMany: vi.fn(async () => []) },
    domain: {
      findMany: vi.fn(async () => []),
      createMany: domainCreateMany,
      updateMany: domainUpdateMany,
    },
    siteMember: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(
        async ({ where }: { where: { siteId_userId: { userId: string } } }) =>
          existingMemberIds.has(where.siteId_userId.userId)
            ? { userId: where.siteId_userId.userId }
            : null,
      ),
      create: memberCreate,
    },
    media: { findMany: vi.fn(async () => options.mediaRows ?? []), create: vi.fn() },
    product: {
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => null),
      create: vi.fn().mockResolvedValue({ id: 'product-new' }),
    },
    order: {
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => null),
      create: vi.fn().mockResolvedValue({ id: 'order-new' }),
    },
    auditLog: { create: vi.fn(async ({ data }: { data: unknown }) => audit(data)) },
  };

  const db = {
    forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx)),
    domain: {
      findMany: vi.fn(async ({ where }: { where?: { hostname?: { in?: string[] } } }) =>
        (where?.hostname?.in ?? [])
          .filter((hostname) => takenHostnames.has(hostname))
          .map((hostname) => ({ hostname })),
      ),
    },
    user: {
      findMany: vi.fn(async ({ where }: { where?: { email?: { in?: string[] } } }) =>
        (options.users ?? []).filter((user) =>
          (where?.email?.in ?? []).includes(user.email.toLowerCase()),
        ),
      ),
    },
  } as unknown as PrismaService;

  return {
    db,
    contentCreate,
    subscriberCreateMany,
    audit,
    domainCreateMany,
    domainUpdateMany,
    memberCreate,
    globalBlockCreate,
    globalBlockUpdate,
  };
};

const storageStub = (): MediaStorage =>
  ({ read: vi.fn().mockResolvedValue(null) }) as unknown as MediaStorage;

const mediaStub = (): MediaService =>
  ({ importFile: vi.fn().mockResolvedValue({ id: 'media-1' }) }) as unknown as MediaService;

const service = (db: PrismaService): BackupService =>
  new BackupService(db, storageStub(), mediaStub(), { log: vi.fn() } as never);

describe('BackupService.importSite', () => {
  it('adds new contents and skips ones that already exist', async () => {
    const { db, contentCreate } = stubs({ existingContentSlugs: ['home'] });

    const result = await service(db).importSite(
      SITE_ID,
      importInput({
        contents: [
          {
            type: 'page',
            title: 'หน้าแรก',
            slug: 'home',
            locale: 'th',
            status: 'published',
            blocksDraft: [],
            blocksPublished: [],
            excerpt: null,
            seo: { noindex: false },
            publishedAt: null,
          },
          {
            type: 'page',
            title: 'บริการ',
            slug: 'services',
            locale: 'th',
            status: 'draft',
            blocksDraft: [],
            blocksPublished: null,
            excerpt: null,
            seo: { noindex: false },
            publishedAt: null,
          },
        ],
      }),
      'user-1',
    );

    expect(contentCreate).toHaveBeenCalledTimes(1);
    expect(result.contents).toEqual({ added: 1, skipped: 1 });
  });

  it('counts subscribers that were already there as skipped', async () => {
    const { db } = stubs({ subscribersCreated: 1 });

    const result = await service(db).importSite(
      SITE_ID,
      importInput({
        subscribers: [
          { email: 'a@example.com', status: 'active' },
          { email: 'b@example.com', status: 'active' },
        ],
      }),
      'user-1',
    );

    expect(result.subscribers).toEqual({ added: 1, skipped: 1 });
  });

  it('writes an audit entry for the restore', async () => {
    const { db, audit } = stubs();

    await service(db).importSite(SITE_ID, importInput(), 'user-1');

    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'site.import' }));
  });

  it('reconnects domains and keeps only one primary', async () => {
    const all = stubs();

    const result = await service(all.db).importSite(
      SITE_ID,
      importInput({ domains: [{ hostname: 'baandoi.com', isPrimary: true }] }),
      'user-1',
    );

    expect(all.domainUpdateMany).toHaveBeenCalledWith({
      where: { siteId: SITE_ID, isPrimary: true },
      data: { isPrimary: false },
    });
    expect(all.domainCreateMany).toHaveBeenCalledWith({
      data: [{ siteId: SITE_ID, hostname: 'baandoi.com', isPrimary: true }],
      skipDuplicates: true,
    });
    expect(result.domains).toEqual({ added: 1, skipped: 0 });
  });

  it('skips a domain that another site already owns', async () => {
    const all = stubs({ takenHostnames: ['taken.com'] });

    const result = await service(all.db).importSite(
      SITE_ID,
      importInput({ domains: [{ hostname: 'taken.com', isPrimary: false }] }),
      'user-1',
    );

    expect(all.domainCreateMany).not.toHaveBeenCalled();
    expect(result.domains).toEqual({ added: 0, skipped: 1 });
  });

  it('restores memberships only for existing accounts, never a second owner', async () => {
    const all = stubs({
      users: [
        { id: 'u-2', email: 'editor@example.com' },
        { id: 'u-3', email: 'existing@example.com' },
      ],
      existingMemberIds: ['u-3'],
    });

    const result = await service(all.db).importSite(
      SITE_ID,
      importInput({
        members: [
          { email: 'editor@example.com', role: 'editor' },
          { email: 'existing@example.com', role: 'viewer' },
          { email: 'owner@example.com', role: 'owner' },
          { email: 'ghost@example.com', role: 'viewer' },
        ],
      }),
      'user-1',
    );

    expect(all.memberCreate).toHaveBeenCalledTimes(1);
    expect(all.memberCreate).toHaveBeenCalledWith({
      data: { siteId: SITE_ID, userId: 'u-2', role: 'editor' },
    });
    expect(result.members).toEqual({ added: 1, skipped: 3 });
  });

  it('merges a global block into the existing block of the same kind', async () => {
    const all = stubs({ globalKinds: ['header'] });

    const result = await service(all.db).importSite(
      SITE_ID,
      importInput({
        globalBlocks: [{ name: 'หัวเว็บ', kind: 'header', blocks: [] }],
      }),
      'user-1',
    );

    expect(all.globalBlockUpdate).toHaveBeenCalledWith({
      where: { id: 'g-header' },
      data: { blocks: [], name: 'หัวเว็บ' },
    });
    expect(all.globalBlockCreate).not.toHaveBeenCalled();
    expect(result.globalBlocks).toBe(1);
  });
});

describe('BackupService.exportSite', () => {
  it('returns a downloadable JSON file named after the site', async () => {
    const { db } = stubs();

    const file = await service(db).exportSite(SITE_ID);

    expect(file.filename).toMatch(/^baandoi-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(file.content)).toMatchObject({ version: SITE_EXPORT_VERSION });
  });
});

describe('BackupService media', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01]);

  it('restores original bytes through the media library', async () => {
    const { db } = stubs();
    const importFile = vi.fn().mockResolvedValue({ id: 'media-1' });

    const result = await new BackupService(
      db,
      storageStub(),
      { importFile } as unknown as MediaService,
      { log: vi.fn() } as never,
    ).importSite(
      SITE_ID,
      importInput({
        media: [
          {
            filename: 'logo.png',
            mime: 'image/png',
            sizeBytes: png.length,
            width: 120,
            height: 40,
            alt: 'โลโก้',
            folder: 'brand',
            focalPoint: null,
            files: [{ name: 'original', mime: 'image/png', base64: png.toString('base64') }],
          },
        ],
      }),
      'user-1',
    );

    expect(importFile).toHaveBeenCalledWith(
      SITE_ID,
      expect.objectContaining({
        filename: 'logo.png',
        mime: 'image/png',
        alt: 'โลโก้',
        folder: 'brand',
        data: png,
      }),
      'user-1',
    );
    expect(result.media).toEqual({ added: 1, skipped: 0 });
  });

  it('counts media files that could not be restored instead of failing the import', async () => {
    const { db } = stubs();
    const importFile = vi.fn().mockRejectedValue(new Error('quota'));

    const result = await new BackupService(
      db,
      storageStub(),
      { importFile } as unknown as MediaService,
      { log: vi.fn() } as never,
    ).importSite(
      SITE_ID,
      importInput({
        media: [
          {
            filename: 'big.png',
            mime: 'image/png',
            sizeBytes: 10,
            width: null,
            height: null,
            alt: null,
            folder: null,
            files: [{ name: 'original', mime: 'image/png', base64: png.toString('base64') }],
          },
        ],
      }),
      'user-1',
    );

    expect(result.media).toEqual({ added: 0, skipped: 1 });
  });
});

describe('BackupService export media', () => {
  it('attaches the original bytes and keeps metadata for files over the budget', async () => {
    const bytes = Buffer.from('image-bytes');
    const mediaRows = [
      {
        storageKey: 'site/a.png',
        filename: 'a.png',
        mime: 'image/png',
        sizeBytes: BigInt(bytes.length),
        width: 10,
        height: 10,
        alt: null,
        folder: null,
        focalPoint: null,
      },
      {
        storageKey: 'site/big.png',
        filename: 'big.png',
        mime: 'image/png',
        sizeBytes: BigInt(20 * 1024 * 1024 * 1024),
        width: null,
        height: null,
        alt: null,
        folder: null,
        focalPoint: null,
      },
    ];
    const storage = {
      read: vi.fn().mockResolvedValue(bytes),
    } as unknown as MediaStorage;

    const file = await new BackupService(stubs({ mediaRows }).db, storage, mediaStub(), { log: vi.fn() } as never).exportSite(
      SITE_ID,
    );
    const exported = JSON.parse(file.content) as {
      media: { filename: string; files: { base64: string }[] }[];
    };

    expect(exported.media[0]?.files[0]?.base64).toBe(bytes.toString('base64'));
    expect(exported.media[1]?.files).toEqual([]);
  });
});

describe('BackupService shop data', () => {
  it('restores products and orders, skipping rows that already exist', async () => {
    const { db } = stubs();
    const result = await service(db).importSite(
      SITE_ID,
      importInput({
        products: [
          {
            title: 'กาแฟคั่วกลาง',
            slug: 'medium-roast',
            description: '',
            price: 35_000,
            compareAtPrice: null,
            stock: 10,
            category: 'เมล็ดกาแฟ',
            status: 'active',
            images: [],
          },
        ],
        orders: [
          {
            number: 'LM-261022-AB12',
            status: 'pending',
            paymentMethod: 'promptpay',
            customer: { name: 'อรุณี', phone: '0891234567' },
            note: '',
            subtotal: 35_000,
            shippingFee: 5_000,
            total: 40_000,
            trackingNumber: null,
            paidAt: null,
            createdAt: '2026-10-22T09:00:00.000Z',
            items: [{ title: 'กาแฟคั่วกลาง', price: 35_000, quantity: 1 }],
          },
        ],
      }),
      'user-1',
    );

    expect(result.products).toEqual({ added: 1, skipped: 0 });
    expect(result.orders).toEqual({ added: 1, skipped: 0 });
  });

  it('exports the shop inside the same backup file', async () => {
    const { db } = stubs();
    const file = await service(db).exportSite(SITE_ID);
    const payload = JSON.parse(file.content) as { products: unknown[]; orders: unknown[] };

    expect(payload.products).toEqual([]);
    expect(payload.orders).toEqual([]);
  });
});

import { describe, expect, it, vi, type Mock } from 'vitest';
import { Prisma } from '@prisma/client';
import sharp from 'sharp';
import { MEDIA_MAX_UPLOAD_BYTES, isAccessiblePrimary } from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import { InMemoryMediaQueue } from './media.queue';
import { MediaService } from './media.service';
import { NoopMediaScanner, type MediaScanner } from './media.scanner';
import type { QuotaService } from '../billing/quota.service';
import {
  LocalMediaStorage,
  createUploadToken,
  sniffImageMime,
  type MediaStorage,
  type UploadTicket,
} from './media.storage';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const MEDIA_ID = '00000000-0000-4000-8000-0000000000b1';
const USER_ID = '00000000-0000-4000-8000-000000000001';
const SECRET = 'test-secret';

const pngBytes = (): Buffer =>
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(64),
  ]);

/** The sniffable head of a JPEG, which is what the media rows claim to be. */
const jpegBytes = (): Buffer =>
  Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(60)]);

const mediaRow = (overrides: Record<string, unknown> = {}) => ({
  id: MEDIA_ID,
  siteId: SITE_ID,
  storageKey: 'baandoi/2026/10/abc-hero.jpg',
  mime: 'image/jpeg',
  filename: 'hero.jpg',
  alt: null,
  folder: null,
  width: 1600,
  height: 900,
  sizeBytes: 1024n,
  focalPoint: null,
  variants: [
    { w: 480, h: 270, url: 'baandoi/2026/10/abc-hero-480.webp', format: 'webp' },
    { w: 1024, h: 576, url: 'baandoi/2026/10/abc-hero-1024.webp', format: 'webp' },
  ],
  status: 'ready',
  createdAt: new Date('2026-10-20T00:00:00Z'),
  updatedAt: new Date('2026-10-20T00:00:00Z'),
  ...overrides,
});

interface StorageStub {
  storage: MediaStorage;
  put: Mock;
  size: Mock;
  readHead: Mock;
  remove: Mock;
  tokens: Map<string, UploadTicket>;
}

const storageStub = (
  options: { storedSize?: number | null; token?: UploadTicket; head?: Buffer } = {},
) => {
  const put = vi.fn().mockResolvedValue(undefined);
  const size = vi
    .fn()
    .mockResolvedValue(options.storedSize === undefined ? 1024 : options.storedSize);
  const readHead = vi.fn().mockResolvedValue(options.head ?? jpegBytes());
  const remove = vi.fn().mockResolvedValue(undefined);
  const tokens = new Map<string, UploadTicket>();
  if (options.token) tokens.set('valid-token', options.token);

  const storage: MediaStorage = {
    driver: 'local',
    presign: vi.fn().mockResolvedValue({
      url: 'https://api.example.com/api/v1/media/upload/signed',
      expiresAt: '2026-10-20T00:15:00.000Z',
      headers: { 'content-type': 'image/jpeg' },
    }),
    verify: (token: string) => tokens.get(token) ?? null,
    put,
    read: vi.fn().mockResolvedValue(null),
    readHead,
    size,
    remove,
  };

  return { storage, put, size, readHead, remove, tokens };
};

const dbWith = (tx: Record<string, unknown>): PrismaService =>
  ({
    forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx)),
  }) as unknown as PrismaService;

const auditStub = (): { log: Mock } => ({ log: vi.fn().mockResolvedValue(undefined) });

const quotaStub = (): QuotaService =>
  ({ assertCanAddMediaBytes: vi.fn().mockResolvedValue(undefined) }) as unknown as QuotaService;

const service = (
  tx: Record<string, unknown>,
  storage: StorageStub,
  queue = new InMemoryMediaQueue(),
  quota: QuotaService = quotaStub(),
  scanner: MediaScanner = new NoopMediaScanner(),
) =>
  new MediaService(
    dbWith(tx),
    auditStub() as unknown as AuditService,
    storage.storage,
    queue,
    quota,
    scanner,
  );

describe('MediaService storage quota', () => {
  it('checks the storage quota before handing out an upload URL', async () => {
    const storage = storageStub();
    const quota = { assertCanAddMediaBytes: vi.fn().mockResolvedValue(undefined) };

    await service(
      { media: { create: vi.fn().mockResolvedValue(mediaRow({ status: 'pending' })) } },
      storage,
      undefined,
      quota as unknown as QuotaService,
    ).presign(SITE_ID, { filename: 'hero.jpg', mime: 'image/jpeg', size: 4096 }, USER_ID);

    expect(quota.assertCanAddMediaBytes).toHaveBeenCalledWith(SITE_ID, 4096);
  });
});

describe('MediaService.presign', () => {
  it('reserves a site-scoped key and returns the presigned URL', async () => {
    const create = vi.fn().mockResolvedValue(mediaRow({ status: 'pending' }));
    const storage = storageStub();

    const result = await service({ media: { create } }, storage).presign(
      SITE_ID,
      { filename: 'hero.jpg', mime: 'image/jpeg', size: 2048, folder: 'hero' },
      USER_ID,
    );

    expect(result).toMatchObject({ mediaId: MEDIA_ID, method: 'PUT', maxBytes: 15 * 1024 * 1024 });
    expect(result.uploadUrl).toContain('/media/upload/');

    const data = create.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(data).toMatchObject({ siteId: SITE_ID, status: 'pending', folder: 'hero' });
    expect(String(data.storageKey).startsWith(`${SITE_ID}/`)).toBe(true);
    expect(String(data.storageKey).endsWith('.jpg')).toBe(true);
  });

  it('rejects SVG before any row is created', async () => {
    const create = vi.fn();
    const storage = storageStub();

    await expect(
      service({ media: { create } }, storage).presign(
        SITE_ID,
        { filename: 'logo.svg', mime: 'image/svg+xml' as never, size: 10 },
        USER_ID,
      ),
    ).rejects.toThrowError();
    expect(create).not.toHaveBeenCalled();
  });
});

describe('MediaService.acceptUpload', () => {
  it('sniffs the bytes and stores them under the signed key', async () => {
    const ticket: UploadTicket = { key: 'baandoi/2026/10/abc.png', mime: 'image/png', size: 4096 };
    const storage = storageStub({ token: ticket });
    const bytes = pngBytes();

    const result = await service({}, storage).acceptUpload('valid-token', bytes);

    expect(result).toEqual({ key: ticket.key });
    expect(storage.put).toHaveBeenCalledWith(ticket.key, bytes, 'image/png');
  });

  it('refuses a file whose real type differs from the declared one', async () => {
    const ticket: UploadTicket = { key: 'baandoi/2026/10/abc.png', mime: 'image/png', size: 4096 };
    const storage = storageStub({ token: ticket });

    await expect(
      service({}, storage).acceptUpload('valid-token', Buffer.from([0xff, 0xd8, 0xff, 0xe0])),
    ).rejects.toThrow(/ชนิดไฟล์ไม่ตรงกับที่แจ้งไว้/);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('refuses an unknown or expired token', async () => {
    const storage = storageStub();
    await expect(service({}, storage).acceptUpload('forged', pngBytes())).rejects.toThrow(
      ApiException,
    );
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('refuses a payload larger than the signed limit', async () => {
    const ticket: UploadTicket = { key: 'k.png', mime: 'image/png', size: 4 };
    const storage = storageStub({ token: ticket });

    await expect(service({}, storage).acceptUpload('valid-token', pngBytes())).rejects.toThrow(
      /ไฟล์ใหญ่กว่าที่แจ้งไว้/,
    );
  });
});

describe('MediaService.confirm', () => {
  it('confirms the upload and queues the render job', async () => {
    const update = vi.fn().mockResolvedValue(mediaRow({ status: 'processing' }));
    const storage = storageStub({ storedSize: 2048 });
    const queue = new InMemoryMediaQueue();

    const item = await service(
      { media: { findUnique: vi.fn().mockResolvedValue(mediaRow()), update } },
      storage,
      queue,
    ).confirm(SITE_ID, MEDIA_ID, { width: 1600, height: 900, alt: 'หน้าร้าน' }, USER_ID);

    expect(item.status).toBe('processing');
    expect(item.srcSet).toContain('abc-hero-480.webp 480w');
    expect(queue.size).toBe(1);

    const data = update.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(data).toMatchObject({ status: 'processing', alt: 'หน้าร้าน', sizeBytes: 2048n });
  });

  it('refuses to confirm before the file has landed', async () => {
    const storage = storageStub({ storedSize: null });
    const tx = { media: { findUnique: vi.fn().mockResolvedValue(mediaRow()), update: vi.fn() } };

    await expect(service(tx, storage).confirm(SITE_ID, MEDIA_ID, {}, USER_ID)).rejects.toThrow(
      /ยังไม่พบไฟล์ที่อัปโหลด/,
    );
  });

  it('cannot confirm a media row from another site', async () => {
    const storage = storageStub();
    const tx = { media: { findUnique: vi.fn().mockResolvedValue(null), update: vi.fn() } };

    await expect(service(tx, storage).confirm(SITE_ID, MEDIA_ID, {}, USER_ID)).rejects.toThrow(
      ApiException,
    );
  });

  it('drops an object that is bigger than the upload limit', async () => {
    const storage = storageStub({ storedSize: MEDIA_MAX_UPLOAD_BYTES + 1 });
    const tx = { media: { findUnique: vi.fn().mockResolvedValue(mediaRow()), update: vi.fn() } };

    await expect(service(tx, storage).confirm(SITE_ID, MEDIA_ID, {}, USER_ID)).rejects.toThrow(
      /รูปใหญ่เกินไป/,
    );
    expect(storage.remove).toHaveBeenCalledWith('baandoi/2026/10/abc-hero.jpg');
  });

  it('drops an object whose real bytes do not match the declared format', async () => {
    // A PNG renamed to .jpg reaches the bucket through a presigned PUT, so the
    // magic bytes are checked again before the row is accepted.
    const storage = storageStub({ head: pngBytes() });
    const tx = { media: { findUnique: vi.fn().mockResolvedValue(mediaRow()), update: vi.fn() } };

    await expect(service(tx, storage).confirm(SITE_ID, MEDIA_ID, {}, USER_ID)).rejects.toThrow(
      /ไม่ใช่รูปแบบที่ระบบรองรับ/,
    );
    expect(storage.remove).toHaveBeenCalledWith('baandoi/2026/10/abc-hero.jpg');
  });
});

describe('MediaService.list', () => {
  it('maps rows, resolves URLs and hides trashed media', async () => {
    const findMany = vi.fn().mockResolvedValue([mediaRow(), mediaRow({ id: 'm2' })]);
    const page = await service({ media: { findMany } }, storageStub()).list(
      SITE_ID,
      { limit: 1 },
      { q: 'hero', folder: 'hero' },
    );

    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      id: MEDIA_ID,
      url: 'http://localhost:49100/media/baandoi/2026/10/abc-hero-1024.webp',
      status: 'ready',
      sizeBytes: 1024,
    });
    expect(page.cursor).toBe(MEDIA_ID);

    const args = findMany.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(args.where).toMatchObject({
      status: { not: 'trashed' },
      folder: 'hero',
      OR: [
        { filename: { contains: 'hero', mode: 'insensitive' } },
        { alt: { contains: 'hero', mode: 'insensitive' } },
      ],
    });
  });

  it('keeps library rows readable even when the JSON is corrupt', async () => {
    const findMany = vi.fn().mockResolvedValue([
      mediaRow({ variants: 'not-an-array', sizeBytes: null, status: 'weird' }),
    ]);
    const page = await service({ media: { findMany } }, storageStub()).list(
      SITE_ID,
      { limit: 20 },
      {},
    );

    expect(page.items[0]).toMatchObject({ variants: [], status: 'pending', sizeBytes: null });
    expect(page.cursor).toBeNull();
  });

  it('lists the folders that still have media', async () => {
    const findMany = vi.fn().mockResolvedValue([{ folder: 'hero' }, { folder: 'brand' }, { folder: null }]);
    const folders = await service({ media: { findMany } }, storageStub()).listFolders(SITE_ID);

    expect(folders).toEqual(['brand', 'hero']);
  });
});

describe('MediaService.update', () => {
  it('stores alt text and the focal point', async () => {
    const update = vi.fn().mockResolvedValue(mediaRow({ alt: 'หน้าร้าน', focalPoint: { x: 0.5, y: 0.4 } }));
    const item = await service(
      { media: { findUnique: vi.fn().mockResolvedValue(mediaRow()), update } },
      storageStub(),
    ).update(SITE_ID, MEDIA_ID, { alt: 'หน้าร้าน', focalPoint: { x: 0.5, y: 0.4 } }, USER_ID);

    expect(item).toMatchObject({ alt: 'หน้าร้าน', focalPoint: { x: 0.5, y: 0.4 } });
  });

  it('clears the focal point with a JSON null instead of a missing value', async () => {
    const update = vi.fn().mockResolvedValue(mediaRow());
    await service(
      { media: { findUnique: vi.fn().mockResolvedValue(mediaRow()), update } },
      storageStub(),
    ).update(SITE_ID, MEDIA_ID, { focalPoint: null, alt: null }, USER_ID);

    const data = update.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(data.alt).toBeNull();
    expect(data.focalPoint).toBe(Prisma.JsonNull);
  });

  it('re-renders the ladder after a crop change', async () => {
    const queue = new InMemoryMediaQueue();
    const crop = { x: 0, y: 0, width: 0.5, height: 0.5 };
    const update = vi.fn().mockResolvedValue(mediaRow({ crop, status: 'processing' }));

    const item = await service(
      { media: { findUnique: vi.fn().mockResolvedValue(mediaRow()), update } },
      storageStub(),
      queue,
    ).update(SITE_ID, MEDIA_ID, { crop }, USER_ID);

    expect(update.mock.calls[0]?.[0]?.data).toMatchObject({ crop, status: 'processing' });
    expect(item.crop).toEqual(crop);
    expect(await queue.take()).toMatchObject({ siteId: SITE_ID, mediaId: MEDIA_ID });
  });

  it('does not queue another render when the crop is unchanged', async () => {
    const queue = new InMemoryMediaQueue();
    const crop = { x: 0, y: 0, width: 0.5, height: 0.5 };
    const update = vi.fn().mockResolvedValue(mediaRow({ crop }));

    await service(
      { media: { findUnique: vi.fn().mockResolvedValue(mediaRow({ crop })), update } },
      storageStub(),
      queue,
    ).update(SITE_ID, MEDIA_ID, { crop }, USER_ID);

    expect(update.mock.calls[0]?.[0]?.data).toMatchObject({ status: undefined });
    expect(await queue.take()).toBeNull();
  });

  it('refuses to crop an animated GIF or an image that is still rendering', async () => {
    const update = vi.fn();
    await expect(
      service(
        {
          media: {
            findUnique: vi.fn().mockResolvedValue(mediaRow({ mime: 'image/gif' })),
            update,
          },
        },
        storageStub(),
      ).update(SITE_ID, MEDIA_ID, { crop: { x: 0, y: 0, width: 0.5, height: 0.5 } }, USER_ID),
    ).rejects.toMatchObject({ code: 'conflict' });

    await expect(
      service(
        {
          media: {
            findUnique: vi.fn().mockResolvedValue(mediaRow({ status: 'processing' })),
            update,
          },
        },
        storageStub(),
      ).update(SITE_ID, MEDIA_ID, { crop: { x: 0, y: 0, width: 0.5, height: 0.5 } }, USER_ID),
    ).rejects.toMatchObject({ code: 'conflict' });
    expect(update).not.toHaveBeenCalled();
  });
});

describe('MediaService.remove / restore', () => {
  it('soft deletes so the undo toast can bring the image back', async () => {
    const update = vi.fn().mockResolvedValue(mediaRow({ status: 'trashed' }));
    await service(
      { media: { findUnique: vi.fn().mockResolvedValue(mediaRow()), update } },
      storageStub(),
    ).remove(SITE_ID, MEDIA_ID, USER_ID);

    expect(update.mock.calls[0]?.[0]).toMatchObject({
      where: { id: MEDIA_ID },
      data: { status: 'trashed' },
    });
  });

  it('restores a trashed image to ready', async () => {
    const update = vi.fn().mockResolvedValue(mediaRow({ status: 'ready' }));
    const item = await service(
      { media: { findUnique: vi.fn().mockResolvedValue(mediaRow({ status: 'trashed' })), update } },
      storageStub(),
    ).restore(SITE_ID, MEDIA_ID, USER_ID);

    expect(item.status).toBe('ready');
  });

  it('hides trashed media from reads and writes', async () => {
    const tx = { media: { findUnique: vi.fn().mockResolvedValue(mediaRow({ status: 'trashed' })) } };
    await expect(service(tx, storageStub()).get(SITE_ID, MEDIA_ID)).rejects.toThrow(ApiException);
  });

  it('purges the row and every file it owns', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const storage = storageStub();
    storage.storage = { ...storage.storage, remove };
    const deleteRow = vi.fn().mockResolvedValue(mediaRow());

    await service(
      { media: { findUnique: vi.fn().mockResolvedValue(mediaRow()), delete: deleteRow } },
      storage,
    ).purge(SITE_ID, MEDIA_ID);

    expect(remove).toHaveBeenCalledWith('baandoi/2026/10/abc-hero-480.webp');
    expect(remove).toHaveBeenCalledWith('baandoi/2026/10/abc-hero.jpg');
    expect(deleteRow).toHaveBeenCalledWith({ where: { id: MEDIA_ID } });
  });
});

describe('sniffImageMime guardrail', () => {
  it('stays the single source of truth for accepted uploads', () => {
    expect(sniffImageMime(pngBytes())).toBe('image/png');
    const { token } = createUploadToken(
      { key: 'k.png', mime: 'image/png', size: 4096 },
      SECRET,
      60_000,
    );
    expect(new LocalMediaStorage('/tmp', SECRET, 'http://x', 60_000).verify(token)).toMatchObject({
      key: 'k.png',
    });
  });
});

const logoPng = (background: string): Promise<Buffer> =>
  sharp({ create: { width: 8, height: 8, channels: 3, background } }).png().toBuffer();

describe('MediaService.palette', () => {
  it('reads the brand colour out of the stored logo', async () => {
    const storage = storageStub();
    storage.storage.read = vi.fn().mockResolvedValue(await logoPng('#F97316'));

    const palette = await service(
      { media: { findUnique: vi.fn().mockResolvedValue(mediaRow()) } },
      storage,
    ).palette(SITE_ID, MEDIA_ID);

    expect(palette.fromLogo).toBe(true);
    expect(isAccessiblePrimary(palette.primary)).toBe(true);
    expect(storage.storage.read).toHaveBeenCalledWith('baandoi/2026/10/abc-hero.jpg');
  });

  it('hides the logo of another site', async () => {
    const storage = storageStub();

    await expect(
      service({ media: { findUnique: vi.fn().mockResolvedValue(null) } }, storage).palette(
        SITE_ID,
        MEDIA_ID,
      ),
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it('waits for the image pipeline before reading colours', async () => {
    const storage = storageStub();

    await expect(
      service(
        { media: { findUnique: vi.fn().mockResolvedValue(mediaRow({ status: 'pending' })) } },
        storage,
      ).palette(SITE_ID, MEDIA_ID),
    ).rejects.toMatchObject({ code: 'conflict' });
  });

  it('says the file itself is unreadable instead of blaming the owner', async () => {
    const storage = storageStub();
    storage.storage.read = vi.fn().mockResolvedValue(Buffer.from('not an image'));

    await expect(
      service(
        { media: { findUnique: vi.fn().mockResolvedValue(mediaRow()) } },
        storage,
      ).palette(SITE_ID, MEDIA_ID),
    ).rejects.toMatchObject({
      code: 'conflict',
      message: 'อ่านสีจากรูปนี้ไม่ได้ ลองใช้รูปอื่นหรือเลือกสีเอง',
    });
  });
});

const purgeDb = (sites: string[], tx: Record<string, unknown>): PrismaService =>
  ({
    site: { findMany: vi.fn().mockResolvedValue(sites.map((id) => ({ id }))) },
    forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx)),
  }) as unknown as PrismaService;

describe('MediaService avif ladder', () => {
  it('answers with both the AVIF and the WebP ladders', async () => {
    const storage = storageStub();
    const row = mediaRow({
      variants: [
        { w: 480, h: 270, url: 'baandoi/2026/10/abc-hero-480.webp', format: 'webp' },
        { w: 480, h: 270, url: 'baandoi/2026/10/abc-hero-480.avif', format: 'avif' },
      ],
    });

    const item = await service(
      { media: { findUnique: vi.fn().mockResolvedValue(row) } },
      storage,
    ).get(SITE_ID, MEDIA_ID);

    expect(item.srcSet).toContain('abc-hero-480.webp 480w');
    expect(item.avifSrcSet).toContain('abc-hero-480.avif 480w');
  });
});

describe('MediaService trash retention', () => {
  it('stamps the deletion time so the sweep knows when to delete the files', async () => {
    const update = vi.fn().mockResolvedValue(mediaRow({ status: 'trashed' }));
    const storage = storageStub();

    await service(
      {
        media: { findUnique: vi.fn().mockResolvedValue(mediaRow()), update },
        auditLog: { create: vi.fn().mockResolvedValue({}) },
      },
      storage,
    ).remove(SITE_ID, MEDIA_ID, USER_ID);

    const data = update.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(data.status).toBe('trashed');
    expect(data.archivedAt).toBeInstanceOf(Date);
  });

  it('clears the deletion time when an image comes back', async () => {
    const update = vi.fn().mockResolvedValue(mediaRow());
    const storage = storageStub();

    await service(
      {
        media: {
          findUnique: vi.fn().mockResolvedValue(mediaRow({ status: 'trashed' })),
          update,
        },
        auditLog: { create: vi.fn().mockResolvedValue({}) },
      },
      storage,
    ).restore(SITE_ID, MEDIA_ID, USER_ID);

    expect(update.mock.calls[0]?.[0]?.data).toMatchObject({ archivedAt: null });
  });

  it('deletes images that aged out of the trash along with every file', async () => {
    const storage = storageStub();
    const findMany = vi.fn().mockResolvedValue([
      {
        id: MEDIA_ID,
        storageKey: 'baandoi/2026/10/abc-hero.jpg',
        filename: 'hero.jpg',
        variants: [
          { w: 480, h: 270, url: 'baandoi/2026/10/abc-hero-480.webp', format: 'webp' },
        ],
      },
    ]);
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const auditCreateMany = vi.fn().mockResolvedValue({ count: 1 });

    const summary = await new MediaService(
      purgeDb([SITE_ID], {
        media: { findMany, deleteMany },
        auditLog: { createMany: auditCreateMany },
      }),
      auditStub() as unknown as AuditService,
      storage.storage,
      new InMemoryMediaQueue(),
      quotaStub(),
    ).purgeExpiredTrash(new Date('2026-12-01T00:00:00Z'));

    expect(summary).toEqual({ sites: 1, purged: 1 });
    expect(findMany.mock.calls[0]?.[0]).toMatchObject({ where: { status: 'trashed' } });
    expect(storage.storage.remove).toHaveBeenCalledWith('baandoi/2026/10/abc-hero-480.webp');
    expect(storage.storage.remove).toHaveBeenCalledWith('baandoi/2026/10/abc-hero.jpg');
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: { in: [MEDIA_ID] } } });
    expect(auditCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ action: 'media.purge' })],
      }),
    );
  });

  it('leaves everything alone when nothing aged out', async () => {
    const storage = storageStub();
    const deleteMany = vi.fn();

    const summary = await new MediaService(
      purgeDb([SITE_ID], {
        media: { findMany: vi.fn().mockResolvedValue([]), deleteMany },
        auditLog: { createMany: vi.fn() },
      }),
      auditStub() as unknown as AuditService,
      storage.storage,
      new InMemoryMediaQueue(),
      quotaStub(),).purgeExpiredTrash();

    expect(summary).toEqual({ sites: 1, purged: 0 });
    expect(storage.storage.remove).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });
});

describe('MediaService virus scanning', () => {
  const infected = (): MediaScanner =>
    ({
      driver: 'clamav',
      scan: vi.fn().mockResolvedValue({ clean: false, signature: 'Eicar-Test-Signature' }),
    }) as MediaScanner;

  it('refuses an infected upload before it is stored', async () => {
    const storage = storageStub({
      token: { key: 's/2026/10/a.jpg', mime: 'image/jpeg', size: 4096 },
    });

    await expect(
      service({}, storage, undefined, quotaStub(), infected()).acceptUpload(
        'valid-token',
        jpegBytes(),
      ),
    ).rejects.toThrow(/ไวรัส/);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('fails closed when the scanner itself is broken', async () => {
    const storage = storageStub({
      token: { key: 's/2026/10/a.jpg', mime: 'image/jpeg', size: 4096 },
    });
    const broken = {
      driver: 'clamav',
      scan: vi.fn().mockRejectedValue(new Error('clamd down')),
    } as unknown as MediaScanner;

    await expect(
      service({}, storage, undefined, quotaStub(), broken).acceptUpload('valid-token', jpegBytes()),
    ).rejects.toThrow(/สแกนไฟล์ไม่สำเร็จ/);
  });
});

describe('MediaService.importFile', () => {
  it('restores a file, queues the render and records an audit entry', async () => {
    const storage = storageStub();
    const created = vi.fn().mockResolvedValue(
      mediaRow({
        id: MEDIA_ID,
        status: 'processing',
        filename: 'restored.jpg',
        storageKey: 'restored-key.jpg',
      }),
    );
    const queue = new InMemoryMediaQueue();
    const add = vi.spyOn(queue, 'add');

    await service(
      { media: { create: created }, auditLog: { create: vi.fn() } },
      storage,
      queue,
    ).importFile(
      SITE_ID,
      { filename: 'restored.jpg', mime: 'image/jpeg', data: jpegBytes(), alt: 'รูปเดิม' },
      USER_ID,
    );

    expect(created.mock.calls[0]?.[0]?.data).toMatchObject({
      filename: 'restored.jpg',
      mime: 'image/jpeg',
      alt: 'รูปเดิม',
      status: 'processing',
    });
    expect(storage.put).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${SITE_ID}/`)),
      expect.any(Buffer),
      'image/jpeg',
    );
    expect(add).toHaveBeenCalledWith({ siteId: SITE_ID, mediaId: MEDIA_ID });
  });

  it('refuses a file whose bytes are not the declared image type', async () => {
    await expect(
      service({ media: { create: vi.fn() } }, storageStub()).importFile(
        SITE_ID,
        { filename: 'not.jpg', mime: 'image/jpeg', data: pngBytes() },
        USER_ID,
      ),
    ).rejects.toThrow(/ชนิดไฟล์/);
  });
});


describe('MediaService bulk actions', () => {
  const secondId = '00000000-0000-4000-8000-0000000000b2';

  it('describes and moves a selection in one audited call', async () => {
    const rows = [mediaRow({ alt: 'แก้วกาแฟ' }), mediaRow({ id: secondId, alt: 'เมล็ดกาแฟ' })];
    const media = {
      findMany: vi
        .fn()
        .mockResolvedValueOnce([{ id: MEDIA_ID }, { id: secondId }])
        .mockResolvedValueOnce(rows),
      updateMany: vi.fn().mockResolvedValue({ count: 2 }),
      update: vi.fn().mockResolvedValue(rows[0]),
    };
    const audit = auditStub();

    const result = await new MediaService(
      dbWith({ media }),
      audit as unknown as AuditService,
      storageStub().storage,
      new InMemoryMediaQueue(),
      quotaStub(),
      new NoopMediaScanner(),
    ).bulkUpdate(
      SITE_ID,
      {
        ids: [MEDIA_ID, secondId],
        alt: [
          { id: MEDIA_ID, alt: 'แก้วกาแฟ' },
          { id: secondId, alt: 'เมล็ดกาแฟ' },
        ],
        folder: 'สินค้า',
      },
      USER_ID,
    );

    expect(result.count).toBe(2);
    expect(media.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [MEDIA_ID, secondId] } },
      data: { folder: 'สินค้า' },
    });
    expect(media.update).toHaveBeenCalledTimes(2);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'media.bulk_update', target: MEDIA_ID }),
    );
  });

  it('rejects a selection containing an image the site does not have', async () => {
    const media = {
      findMany: vi.fn().mockResolvedValue([{ id: MEDIA_ID }]),
      updateMany: vi.fn(),
      update: vi.fn(),
    };

    await expect(
      new MediaService(
        dbWith({ media }),
        auditStub() as unknown as AuditService,
        storageStub().storage,
        new InMemoryMediaQueue(),
        quotaStub(),
        new NoopMediaScanner(),
      ).bulkUpdate(SITE_ID, { ids: [MEDIA_ID, secondId], folder: 'สินค้า' }, USER_ID),
    ).rejects.toBeInstanceOf(ApiException);
    expect(media.updateMany).not.toHaveBeenCalled();
  });
});

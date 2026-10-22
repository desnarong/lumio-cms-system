import { Readable } from 'node:stream';
import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { RATE_LIMIT_KEY, type RateLimitOptions } from '../../common/rate-limit.guard';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import { MediaUploadController } from './media-upload.controller';
import { InMemoryMediaQueue } from './media.queue';
import { MediaService } from './media.service';
import type { MediaStorage, UploadTicket } from './media.storage';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';

const pngBytes = (): Buffer =>
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(32),
  ]);

const requestWith = (body: Buffer): Request => Readable.from([body]) as unknown as Request;

const controllerWith = (options: { token?: UploadTicket } = {}) => {
  const put = vi.fn().mockResolvedValue(undefined);
  const tokens = new Map<string, UploadTicket>();
  if (options.token) tokens.set('token-1', options.token);

  const storage = {
    driver: 'local',
    presign: vi.fn(),
    verify: (token: string) => tokens.get(token) ?? null,
    put,
    read: vi.fn().mockResolvedValue(null),
    readHead: vi.fn().mockResolvedValue(null),
    size: vi.fn().mockResolvedValue(1024),
    remove: vi.fn().mockResolvedValue(undefined),
  } as unknown as MediaStorage;

  const db = {
    forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) =>
      fn({ auditLog: { create: vi.fn() } }),
    ),
  } as unknown as PrismaService;

  const service = new MediaService(
    db,
    { log: vi.fn() } as unknown as AuditService,
    storage,
    new InMemoryMediaQueue(),
    { assertCanAddMediaBytes: vi.fn().mockResolvedValue(undefined) } as never,
  );

  return { controller: new MediaUploadController(service), put };
};

describe('MediaUploadController', () => {
  it('accepts a signed upload and stores the bytes', async () => {
    const { controller, put } = controllerWith({
      token: { key: 'site/a.png', mime: 'image/png', size: 4096 },
    });

    const response = await controller.upload('token-1', requestWith(pngBytes()));

    expect(response.data).toEqual({ key: 'site/a.png' });
    expect(put).toHaveBeenCalledTimes(1);
  });

  it('rejects a forged token without writing anything', async () => {
    const { controller, put } = controllerWith();

    await expect(controller.upload('forged', requestWith(pngBytes()))).rejects.toThrow(
      /ลิงก์อัปโหลดหมดอายุ/,
    );
    expect(put).not.toHaveBeenCalled();
  });

  it('rejects a body that exceeds the signed size', async () => {
    const { controller, put } = controllerWith({
      token: { key: 'site/a.png', mime: 'image/png', size: 8 },
    });

    await expect(controller.upload('token-1', requestWith(pngBytes()))).rejects.toThrow(
      /ไฟล์ใหญ่กว่าที่แจ้งไว้/,
    );
    expect(put).not.toHaveBeenCalled();
  });

  it('is rate limited, because a leaked token must not become a file dump', () => {
    const options = Reflect.getMetadata(
      RATE_LIMIT_KEY,
      MediaUploadController.prototype.upload,
    ) as RateLimitOptions | undefined;

    expect(options).toMatchObject({ limit: 60, windowMs: 60_000 });
  });

  it('only writes to the key that was signed, never one the client picked', async () => {
    const { controller, put } = controllerWith({
      token: { key: `${SITE_ID}/2026/10/abc.png`, mime: 'image/png', size: 4096 },
    });

    await controller.upload('token-1', requestWith(pngBytes()));

    expect(put).toHaveBeenCalledWith(
      `${SITE_ID}/2026/10/abc.png`,
      expect.any(Buffer),
      'image/png',
    );
  });
});
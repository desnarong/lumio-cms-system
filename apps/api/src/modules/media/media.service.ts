import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma, type Media } from '@prisma/client';
import {
  MEDIA_MAX_UPLOAD_BYTES,
  MEDIA_TRASH_RETENTION_DAYS,
  buildSrcSet,
  extractBrandPalette,
  isMediaStatus,
  isUploadMimeType,
  mediaCropSchema,
  mediaUrlFor,
  mediaVariantsSchema,
  pickVariant,
  presignUploadInputSchema,
  resolveVariantUrl,
  slugify,
  type BrandPalette,
  type BulkMediaUpdateResult,
  type BulkUpdateMediaInput,
  type ConfirmUploadInput,
  type MediaCrop,
  type MediaItem,
  type MediaListQuery,
  type MediaVariant,
  type PaginationQuery,
  type PresignUploadInput,
  type PresignUploadResult,
  type UpdateMediaInput,
  type UploadMimeType,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import type { Page } from '../../common/pagination';
import { AuditService } from '../audit/audit.service';
import { QuotaService } from '../billing/quota.service';
import { PrismaService } from '../prisma/prisma.service';
import { readRgbaPixels } from './brand-palette.reader';
import { mediaPublicBaseUrl } from './media.config';
import { MEDIA_QUEUE, type MediaQueue } from './media.queue';
import { MEDIA_SCANNER, NoopMediaScanner, type MediaScanner } from './media.scanner';
import { MEDIA_STORAGE, extensionForMime, sniffImageMime, type MediaStorage } from './media.storage';

/** Widths the editor previews resolve to; the browser scales down from there. */
const PREVIEW_WIDTH = 1024;

export interface MediaPurgeSummary {
  /** Sites scanned by this run. */
  sites: number;
  /** Images (and their rendered files) deleted because they aged out of the trash. */
  purged: number;
}

/** One original file a backup restore puts back into the library. */
export interface ImportMediaInput {
  filename: string;
  mime: string;
  data: Buffer;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  folder?: string | null;
  focalPoint?: { x: number; y: number } | null;
}

const readVariants = (value: unknown): MediaVariant[] => {
  const parsed = mediaVariantsSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
};

const toItem = (row: Media, base: string): MediaItem => {
  const variants = readVariants(row.variants);
  const preview = pickVariant(variants, PREVIEW_WIDTH) ?? variants[variants.length - 1] ?? null;

  return {
    id: row.id,
    url: preview ? resolveVariantUrl(preview, base) : mediaUrlFor(base, row.storageKey),
    srcSet: buildSrcSet(variants, base),
    avifSrcSet: buildSrcSet(variants, base, { format: 'avif' }),
    filename: row.filename,
    mime: row.mime,
    sizeBytes: row.sizeBytes === null ? null : Number(row.sizeBytes),
    width: row.width,
    height: row.height,
    alt: row.alt,
    folder: row.folder,
    focalPoint: readFocalPoint(row.focalPoint),
    crop: readCrop(row.crop),
    variants,
    status: isMediaStatus(row.status) ? row.status : 'pending',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};

const readFocalPoint = (value: unknown): MediaItem['focalPoint'] => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const { x, y } = value as { x?: unknown; y?: unknown };
  return typeof x === 'number' && typeof y === 'number' ? { x, y } : null;
};

const readCrop = (value: unknown): MediaCrop | null => {
  const parsed = mediaCropSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

const sameCrop = (a: MediaCrop | null, b: MediaCrop | null): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height);

const asJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

/** `siteId/2026/10/<uuid>-hero.jpg` keeps tenants apart and files browsable. */
const buildStorageKey = (siteId: string, filename: string, mime: UploadMimeType): string => {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dot = filename.lastIndexOf('.');
  const base = slugify(dot > 0 ? filename.slice(0, dot) : filename, 'image').slice(0, 40);
  return `${siteId}/${now.getUTCFullYear()}/${month}/${randomUUID()}-${base}.${extensionForMime(mime)}`;
};

@Injectable()
export class MediaService {
  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
    @Inject(MEDIA_STORAGE) private readonly storage: MediaStorage,
    @Inject(MEDIA_QUEUE) private readonly jobs: MediaQueue,
    private readonly quota: QuotaService,
    @Inject(MEDIA_SCANNER) private readonly scanner: MediaScanner = new NoopMediaScanner(),
  ) {}

  /** Step 1-2 of docs/design/12-api.md 12.6: validate, reserve a key, presign. */
  async presign(
    siteId: string,
    input: PresignUploadInput,
    actorId: string,
  ): Promise<PresignUploadResult> {
    const parsed = presignUploadInputSchema.parse(input);
    await this.quota.assertCanAddMediaBytes(siteId, parsed.size);
    const key = buildStorageKey(siteId, parsed.filename, parsed.mime);

    const row = await this.db.forSite(siteId, (tx) =>
      tx.media.create({
        data: {
          siteId,
          storageKey: key,
          filename: parsed.filename,
          mime: parsed.mime,
          sizeBytes: BigInt(parsed.size),
          folder: parsed.folder ?? null,
          status: 'pending',
        },
      }),
    );

    const presigned = await this.storage.presign({ key, mime: parsed.mime, size: parsed.size });
    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'media.presign',
      target: row.id,
      meta: { mime: parsed.mime, size: parsed.size },
    });

    return {
      mediaId: row.id,
      uploadUrl: presigned.url,
      method: 'PUT',
      headers: presigned.headers,
      expiresAt: presigned.expiresAt,
      maxBytes: MEDIA_MAX_UPLOAD_BYTES,
    };
  }

  /**
   * Accepts the raw bytes for a signed upload URL. The token carries the only
   * key/mime/size this request may write, and the bytes are sniffed so a renamed
   * file cannot smuggle a different format past the allow-list.
   */
  async acceptUpload(token: string, body: Buffer): Promise<{ key: string }> {
    const ticket = this.storage.verify(token);
    if (!ticket) {
      throw ApiException.validation('ลิงก์อัปโหลดหมดอายุแล้ว กรุณาเริ่มอัปโหลดใหม่');
    }
    if (body.length === 0) {
      throw ApiException.validation('ไม่พบข้อมูลไฟล์ที่ส่งมา');
    }
    if (body.length > ticket.size || body.length > MEDIA_MAX_UPLOAD_BYTES) {
      throw ApiException.validation('ไฟล์ใหญ่กว่าที่แจ้งไว้ กรุณาลองใหม่');
    }

    const sniffed = sniffImageMime(body);
    if (!sniffed) {
      throw ApiException.validation('ไฟล์นี้ไม่ใช่รูปภาพที่ระบบรองรับ');
    }
    if (sniffed !== ticket.mime) {
      throw ApiException.validation('ชนิดไฟล์ไม่ตรงกับที่แจ้งไว้');
    }

    await this.assertClean(body);

    await this.storage.put(ticket.key, body, ticket.mime);
    return { key: ticket.key };
  }

  /** Step 4: dimensions are confirmed and the render job is queued. */
  async confirm(
    siteId: string,
    mediaId: string,
    input: ConfirmUploadInput,
    actorId: string,
  ): Promise<MediaItem> {
    const current = await this.findRow(siteId, mediaId);
    if (current.status === 'trashed') throw ApiException.notFound('ไม่พบรูปนี้');

    const storedSize = await this.storage.size(current.storageKey);
    if (storedSize === null) {
      throw ApiException.conflict('ยังไม่พบไฟล์ที่อัปโหลด กรุณาลองอัปโหลดอีกครั้ง');
    }
    if (storedSize > MEDIA_MAX_UPLOAD_BYTES) {
      await this.storage.remove(current.storageKey);
      throw ApiException.validation('รูปใหญ่เกินไป ลองใช้รูปไม่เกิน 15MB');
    }

    // A presigned PUT cannot cap the size or the format, so the object is
    // sniffed before it is accepted (docs/design/15-security.md 15.3).
    const head = await this.storage.readHead(current.storageKey, 32);
    if (!head || sniffImageMime(head) !== current.mime) {
      await this.storage.remove(current.storageKey);
      throw ApiException.validation('ไฟล์นี้ไม่ใช่รูปแบบที่ระบบรองรับ');
    }

    // With the S3 driver the browser writes straight to the bucket, so the only
    // point that sees the bytes is confirmation; scan before the file is kept.
    const full = await this.storage.read(current.storageKey);
    if (full) {
      const clean = await this.scanner.scan(full).catch(() => null);
      if (!clean) {
        await this.storage.remove(current.storageKey);
        throw ApiException.conflict('สแกนไฟล์ไม่สำเร็จ ลองอัปโหลดใหม่อีกครั้ง');
      }
      if (!clean.clean) {
        await this.storage.remove(current.storageKey);
        throw ApiException.validation('ไฟล์นี้ตรวจพบไวรัส จึงไม่ถูกบันทึก');
      }
    }

    const row = await this.db.forSite(siteId, (tx) =>
      tx.media.update({
        where: { id: mediaId },
        data: {
          width: input.width ?? current.width,
          height: input.height ?? current.height,
          alt: input.alt ?? current.alt,
          folder: input.folder ?? current.folder,
          sizeBytes: BigInt(storedSize),
          status: 'processing',
        },
      }),
    );

    await this.jobs.add({ siteId, mediaId });
    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'media.confirm',
      target: mediaId,
      meta: { size: storedSize },
    });

    return toItem(row, mediaPublicBaseUrl());
  }

  /** Shared virus gate; a scanner that cannot answer refuses the file. */
  private async assertClean(buffer: Buffer): Promise<void> {
    const result = await this.scanner.scan(buffer).catch(() => null);
    if (!result) {
      throw ApiException.conflict('สแกนไฟล์ไม่สำเร็จ ลองอัปโหลดใหม่อีกครั้ง');
    }
    if (!result.clean) {
      throw ApiException.validation('ไฟล์นี้ตรวจพบไวรัส จึงไม่ถูกบันทึก');
    }
  }

  /**
   * Puts one original file that a backup restore carried back into the library
   * (docs/design/05-admin-ia.md "Backup & ประวัติเวอร์ชัน"). The bytes go through
   * the same checks as a normal upload, and the media worker rebuilds the
   * responsive ladder, so restored images end up identical to uploaded ones.
   */
  async importFile(
    siteId: string,
    input: ImportMediaInput,
    actorId: string,
  ): Promise<MediaItem> {
    const mime = input.mime;
    if (!isUploadMimeType(mime)) {
      throw ApiException.validation('ไฟล์สำรองมีชนิดไฟล์ที่ไม่รองรับ');
    }
    if (input.data.length === 0) {
      throw ApiException.validation('ไฟล์สำรองว่างเปล่า');
    }
    if (input.data.length > MEDIA_MAX_UPLOAD_BYTES) {
      throw ApiException.validation('ไฟล์สำรองใหญ่มากเกินกว่าจะกู้คืนได้');
    }
    if (sniffImageMime(input.data) !== mime) {
      throw ApiException.validation('ชนิดไฟล์ในไฟล์สำรองไม่ตรงกับข้อมูล');
    }

    await this.quota.assertCanAddMediaBytes(siteId, input.data.length);
    await this.assertClean(input.data);

    const key = buildStorageKey(siteId, input.filename, mime);
    await this.storage.put(key, input.data, mime);

    const row = await this.db.forSite(siteId, (tx) =>
      tx.media.create({
        data: {
          siteId,
          storageKey: key,
          filename: input.filename,
          mime,
          sizeBytes: BigInt(input.data.length),
          width: input.width ?? null,
          height: input.height ?? null,
          alt: input.alt ?? null,
          folder: input.folder ?? null,
          focalPoint: input.focalPoint ? asJson(input.focalPoint) : undefined,
          status: 'processing',
        },
      }),
    );

    await this.jobs.add({ siteId, mediaId: row.id });
    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'media.import',
      target: row.id,
      meta: { size: input.data.length, mime },
    });

    return toItem(row, mediaPublicBaseUrl());
  }

  async list(
    siteId: string,
    page: PaginationQuery,
    filters: Pick<MediaListQuery, 'q' | 'folder'>,
  ): Promise<Page<MediaItem>> {
    const rows = await this.db.forSite(siteId, (tx) =>
      tx.media.findMany({
        where: {
          status: { not: 'trashed' },
          ...(filters.folder ? { folder: filters.folder } : {}),
          ...(filters.q
            ? {
                OR: [
                  { filename: { contains: filters.q, mode: 'insensitive' } },
                  { alt: { contains: filters.q, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: page.limit + 1,
        ...(page.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
      }),
    );

    const base = mediaPublicBaseUrl();
    const items = rows.slice(0, page.limit).map((row) => toItem(row, base));
    return { items, cursor: rows.length > page.limit ? (items.at(-1)?.id ?? null) : null };
  }

  async listFolders(siteId: string): Promise<string[]> {
    const rows = await this.db.forSite(siteId, (tx) =>
      tx.media.findMany({
        where: { status: { not: 'trashed' }, folder: { not: null } },
        select: { folder: true },
        distinct: ['folder'],
      }),
    );

    return rows
      .map((row) => row.folder)
      .filter((folder): folder is string => typeof folder === 'string' && folder.length > 0)
      .sort((a, b) => a.localeCompare(b, 'th'));
  }

  async get(siteId: string, mediaId: string): Promise<MediaItem> {
    const row = await this.findRow(siteId, mediaId);
    if (row.status === 'trashed') throw ApiException.notFound('ไม่พบรูปนี้');
    return toItem(row, mediaPublicBaseUrl());
  }

  /**
   * Brand colours read from an uploaded logo (docs/design/04-ux.md 4.1 step 4).
   * The wizard shows them as one more palette; nothing is saved here, so the
   * owner still decides whether to use them.
   */
  async palette(siteId: string, mediaId: string): Promise<BrandPalette> {
    const row = await this.findRow(siteId, mediaId);
    if (row.status === 'trashed') throw ApiException.notFound('ไม่พบรูปนี้');
    if (row.status !== 'ready') {
      throw ApiException.conflict('รูปนี้ยังเตรียมไม่เสร็จ รอสักครู่แล้วลองอีกครั้ง');
    }

    const buffer = await this.storage.read(row.storageKey);
    if (!buffer) throw ApiException.notFound('ไม่พบไฟล์รูปนี้');

    try {
      const { data, width, height } = await readRgbaPixels(buffer);
      return extractBrandPalette(data, width, height);
    } catch {
      throw ApiException.conflict('อ่านสีจากรูปนี้ไม่ได้ ลองใช้รูปอื่นหรือเลือกสีเอง');
    }
  }

  async update(
    siteId: string,
    mediaId: string,
    input: UpdateMediaInput,
    actorId: string,
  ): Promise<MediaItem> {
    const current = await this.findRow(siteId, mediaId);
    if (current.status === 'trashed') throw ApiException.notFound('ไม่พบรูปนี้');

    const previousCrop = readCrop(current.crop);
    const nextCrop = input.crop === undefined ? previousCrop : readCrop(input.crop);
    const cropChanged = input.crop !== undefined && !sameCrop(previousCrop, nextCrop);
    if (cropChanged && current.mime === 'image/gif') {
      throw ApiException.conflict('รูป GIF เคลื่อนไหวครอปไม่ได้');
    }
    if (cropChanged && current.status !== 'ready') {
      throw ApiException.conflict('รอรูปโหลดเสร็จก่อนแล้วค่อยครอป');
    }

    const row = await this.db.forSite(siteId, (tx) =>
      tx.media.update({
        where: { id: mediaId },
        data: {
          alt: input.alt === undefined ? undefined : input.alt,
          folder: input.folder === undefined ? undefined : input.folder,
          focalPoint:
            input.focalPoint === undefined
              ? undefined
              : input.focalPoint === null
                ? Prisma.JsonNull
                : asJson(input.focalPoint),
          crop:
            input.crop === undefined
              ? undefined
              : input.crop === null
                ? Prisma.JsonNull
                : asJson(input.crop),
          // The ladder is cut from the new window in the background.
          status: cropChanged ? 'processing' : undefined,
        },
      }),
    );

    if (cropChanged) await this.jobs.add({ siteId, mediaId });

    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'media.update',
      target: mediaId,
      meta: { fields: Object.keys(input) },
    });

    return toItem(row, mediaPublicBaseUrl());
  }

  /**
   * Describes and/or moves a selection of images in one request. The rows are
   * checked together first, so a bad id never leaves a half-applied edit
   * (docs/design/12-api.md 12.8). One audit entry records the batch.
   */
  async bulkUpdate(
    siteId: string,
    input: BulkUpdateMediaInput,
    actorId: string,
  ): Promise<BulkMediaUpdateResult> {
    const ids = [...new Set(input.ids)];
    if (ids.length !== input.ids.length) {
      throw ApiException.validation('มีรูปซ้ำอยู่ในรายการที่เลือก');
    }

    const rows = await this.db.forSite(siteId, async (tx) => {
      const found = await tx.media.findMany({
        where: { id: { in: ids }, status: { not: 'trashed' } },
        select: { id: true },
      });
      if (found.length !== ids.length) {
        throw ApiException.notFound('ไม่พบรูปบางรายการ หรือรูปถูกลบไปแล้ว');
      }

      if (input.folder !== undefined) {
        await tx.media.updateMany({
          where: { id: { in: ids } },
          data: { folder: input.folder },
        });
      }
      for (const entry of input.alt ?? []) {
        await tx.media.update({ where: { id: entry.id }, data: { alt: entry.alt } });
      }

      return tx.media.findMany({
        where: { id: { in: ids } },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      });
    });

    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'media.bulk_update',
      target: ids[0] ?? 'bulk',
      meta: {
        count: ids.length,
        fields: [
          ...(input.alt ? ['alt'] : []),
          ...(input.folder !== undefined ? ['folder'] : []),
        ],
        folder: input.folder ?? null,
      },
    });

    return {
      count: rows.length,
      items: rows.map((row) => toItem(row, mediaPublicBaseUrl())),
    };
  }

  /**
   * Deletes by moving the row to `trashed`: the files stay put so the editor's
   * undo toast can bring the image straight back (docs/design/04-ux.md).
   */
  async remove(siteId: string, mediaId: string, actorId: string): Promise<void> {
    const current = await this.findRow(siteId, mediaId);
    if (current.status === 'trashed') return;

    await this.db.forSite(siteId, (tx) =>
      tx.media.update({
        where: { id: mediaId },
        // The timestamp starts the retention window the sweep counts from.
        data: { status: 'trashed', archivedAt: current.archivedAt ?? new Date() },
      }),
    );
    await this.audit.log({ siteId, userId: actorId, action: 'media.delete', target: mediaId });
  }

  async restore(siteId: string, mediaId: string, actorId: string): Promise<MediaItem> {
    const current = await this.findRow(siteId, mediaId);
    const variants = readVariants(current.variants);

    const row = await this.db.forSite(siteId, (tx) =>
      tx.media.update({
        where: { id: mediaId },
        // Restoring clears the clock, so a re-deleted image gets a full window.
        data: { status: variants.length > 0 ? 'ready' : 'pending', archivedAt: null },
      }),
    );

    await this.audit.log({ siteId, userId: actorId, action: 'media.restore', target: mediaId });
    return toItem(row, mediaPublicBaseUrl());
  }

  /** Deletes one media row and every file it owns; used by tests and cleanup. */
  async purge(siteId: string, mediaId: string): Promise<void> {
    const row = await this.findRow(siteId, mediaId);
    for (const variant of readVariants(row.variants)) {
      await this.storage.remove(variant.url);
    }
    await this.storage.remove(row.storageKey);
    await this.db.forSite(siteId, (tx) => tx.media.delete({ where: { id: mediaId } }));
  }

  /**
   * Deletes images that have been in the trash past the retention window, along
   * with every rendered file (docs/design/05-admin-ia.md "คลังรูป"). It is a
   * sweep rather than a queue, because the work is "find what aged out": cheap
   * to repeat and safe to run twice.
   */
  async purgeExpiredTrash(now: Date = new Date()): Promise<MediaPurgeSummary> {
    const cutoff = new Date(now.getTime() - MEDIA_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const sites = await this.db.site.findMany({ select: { id: true } });

    let purged = 0;
    for (const site of sites) {
      purged += await this.db.forSite(site.id, async (tx) => {
        const expired = await tx.media.findMany({
          where: { status: 'trashed', archivedAt: { lt: cutoff } },
          select: { id: true, storageKey: true, variants: true, filename: true },
        });
        if (expired.length === 0) return 0;

        for (const row of expired) {
          for (const variant of readVariants(row.variants)) {
            await this.storage.remove(variant.url);
          }
          await this.storage.remove(row.storageKey);
        }

        await tx.media.deleteMany({ where: { id: { in: expired.map((row) => row.id) } } });
        await tx.auditLog.createMany({
          data: expired.map((row) => ({
            siteId: site.id,
            userId: null,
            action: 'media.purge',
            target: row.id,
            meta: { filename: row.filename } as Prisma.InputJsonObject,
          })),
        });

        return expired.length;
      });
    }

    return { sites: sites.length, purged };
  }

  private async findRow(siteId: string, mediaId: string): Promise<Media> {
    const row = await this.db.forSite(siteId, (tx) =>
      tx.media.findUnique({ where: { id: mediaId } }),
    );
    if (!row) throw ApiException.notFound('ไม่พบรูปนี้');
    return row;
  }
}
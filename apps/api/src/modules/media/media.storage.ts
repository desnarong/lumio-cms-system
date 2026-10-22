import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, open, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import type { UploadMimeType } from '@lumio/shared';
import { apiPublicUrl, mediaLocalDir, mediaUploadSecret, mediaUploadTtlMs } from './media.config';

/** Injection token so tests can swap the driver without any infrastructure. */
export const MEDIA_STORAGE = 'LUMIO_MEDIA_STORAGE';

/** What the browser is allowed to upload: one key, one mime, one size. */
export interface UploadTicket {
  key: string;
  mime: UploadMimeType;
  size: number;
}

export interface PresignedUpload {
  url: string;
  expiresAt: string;
  headers: Record<string, string>;
}

/**
 * Object storage behind an interface. The local driver used in development and
 * tests speaks the same presigned contract as S3, so the client code and the
 * upload endpoint do not change when MinIO/S3 is wired up.
 *
 * `presign` is asynchronous because the S3 driver asks the SDK to sign the
 * request; the local driver answers immediately.
 */
export interface MediaStorage {
  readonly driver: 'local' | 's3';
  presign(ticket: UploadTicket): Promise<PresignedUpload>;
  /** Validates a signed upload URL; null when it is forged or expired. */
  verify(token: string, now?: Date): UploadTicket | null;
  put(key: string, body: Buffer, mime: string): Promise<void>;
  read(key: string): Promise<Buffer | null>;
  /** First bytes of a stored file, enough to sniff its real type. */
  readHead(key: string, bytes: number): Promise<Buffer | null>;
  size(key: string): Promise<number | null>;
  remove(key: string): Promise<void>;
}

const EXTENSION_BY_MIME: Record<UploadMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

export const extensionForMime = (mime: UploadMimeType): string => EXTENSION_BY_MIME[mime];

/** Mime type of a rendered variant file. */
export const mimeForFormat = (format: string): string =>
  format === 'avif' ? 'image/avif' : format === 'webp' ? 'image/webp' : `image/${format}`;

const sign = (payload: string, secret: string): string =>
  createHmac('sha256', secret).update(payload).digest('base64url');

const encode = (payload: object): string =>
  Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

const decode = (value: string): unknown => {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
};

/**
 * Upload URLs carry everything the upload endpoint needs plus an expiry, signed
 * with an HMAC. That is what makes the PUT unauthenticated without being open:
 * the client cannot change the key, the mime type or the size limit.
 */
export const createUploadToken = (
  ticket: UploadTicket,
  secret: string,
  ttlMs: number,
  now: Date = new Date(),
): { token: string; expiresAt: string } => {
  const expiresAt = new Date(now.getTime() + ttlMs);
  const payload = encode({
    key: ticket.key,
    mime: ticket.mime,
    size: ticket.size,
    exp: Math.floor(expiresAt.getTime() / 1000),
  });
  return { token: `${payload}.${sign(payload, secret)}`, expiresAt: expiresAt.toISOString() };
};

export const verifyUploadToken = (
  token: string,
  secret: string,
  now: Date = new Date(),
): UploadTicket | null => {
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;

  const payload = token.slice(0, separator);
  const provided = Buffer.from(token.slice(separator + 1));
  const expected = Buffer.from(sign(payload, secret));
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  const parsed = decode(payload);
  if (parsed === null || typeof parsed !== 'object') return null;

  const { key, mime, size, exp } = parsed as Record<string, unknown>;
  if (typeof key !== 'string' || typeof mime !== 'string' || typeof size !== 'number') return null;
  if (typeof exp !== 'number' || exp * 1000 <= now.getTime()) return null;

  return { key, mime: mime as UploadMimeType, size };
};

/**
 * Checks the first bytes of the file instead of trusting the declared mime
 * type (docs/design/15-security.md). Returns null for anything that is not a
 * raster image we accept, which also rules out SVG and HTML payloads.
 */
export const sniffImageMime = (buffer: Buffer): UploadMimeType | null => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString('latin1') === 'GIF8') {
    return 'image/gif';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buffer.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString('latin1') === 'ftyp') {
    const brand = buffer.subarray(8, 12).toString('latin1');
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
  }
  return null;
};

/**
 * Local disk driver. Files land under `MEDIA_LOCAL_DIR` in the same
 * `site/yyyy/mm/uuid-name.ext` layout the S3 driver uses, and the API serves
 * them from `/media/*` (see `main.ts`), so a presigned upload is verifiable in
 * development without MinIO.
 */
export class LocalMediaStorage implements MediaStorage {
  readonly driver = 'local' as const;

  constructor(
    private readonly root: string = mediaLocalDir(),
    private readonly secret: string = mediaUploadSecret(),
    private readonly apiBase: string = apiPublicUrl(),
    private readonly ttlMs: number = mediaUploadTtlMs(),
  ) {}

  presign(ticket: UploadTicket): Promise<PresignedUpload> {
    const { token, expiresAt } = createUploadToken(ticket, this.secret, this.ttlMs);
    return Promise.resolve({
      url: `${this.apiBase}/api/v1/media/upload/${token}`,
      expiresAt,
      headers: { 'content-type': ticket.mime },
    });
  }

  verify(token: string, now: Date = new Date()): UploadTicket | null {
    return verifyUploadToken(token, this.secret, now);
  }

  async put(key: string, body: Buffer, _mime: string): Promise<void> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  }

  async read(key: string): Promise<Buffer | null> {
    try {
      return await readFile(this.pathFor(key));
    } catch {
      return null;
    }
  }

  /** Reads only the leading bytes so a stored file can be sniffed cheaply. */
  async readHead(key: string, bytes: number): Promise<Buffer | null> {
    const handle = await open(this.pathFor(key), 'r').catch(() => null);
    if (!handle) return null;
    try {
      const buffer = Buffer.alloc(bytes);
      const { bytesRead } = await handle.read(buffer, 0, bytes, 0);
      return buffer.subarray(0, bytesRead);
    } catch {
      return null;
    } finally {
      await handle.close();
    }
  }

  async size(key: string): Promise<number | null> {
    try {
      const info = await stat(this.pathFor(key));
      return info.isFile() ? info.size : null;
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    await rm(this.pathFor(key), { force: true });
  }

  /** Resolves a key inside the root, refusing anything that tries to escape it. */
  private pathFor(key: string): string {
    const root = resolve(this.root);
    const path = resolve(root, key);
    if (path !== root && !path.startsWith(root + sep)) {
      throw new Error(`media key escapes the storage root: ${key}`);
    }
    return path;
  }
}
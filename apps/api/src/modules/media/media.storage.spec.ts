import { describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mediaUploadSecret } from './media.config';
import {
  LocalMediaStorage,
  createUploadToken,
  extensionForMime,
  mimeForFormat,
  sniffImageMime,
  verifyUploadToken,
} from './media.storage';

const SECRET = 'test-secret';
const TICKET = { key: 'site/2026/10/abc-hero.jpg', mime: 'image/jpeg' as const, size: 1024 };

const pngBytes = (): Buffer =>
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

describe('upload tokens', () => {
  it('round-trips the key, mime type and size limit', () => {
    const { token, expiresAt } = createUploadToken(TICKET, SECRET, 60_000);
    expect(verifyUploadToken(token, SECRET)).toEqual(TICKET);
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('refuses a token signed with another secret', () => {
    const { token } = createUploadToken(TICKET, SECRET, 60_000);
    expect(verifyUploadToken(token, 'other-secret')).toBeNull();
  });

  it('refuses a tampered payload, so the key cannot be swapped', () => {
    const forged = Buffer.from(
      JSON.stringify({ ...TICKET, key: 'other/2026/10/evil.jpg', exp: 9_999_999_999 }),
      'utf8',
    ).toString('base64url');
    expect(verifyUploadToken(`${forged}.not-a-signature`, SECRET)).toBeNull();
  });

  it('refuses an expired token', () => {
    const past = new Date('2026-01-01T00:00:00Z');
    const { token } = createUploadToken(TICKET, SECRET, 60_000, past);
    expect(verifyUploadToken(token, SECRET, new Date('2026-01-01T01:00:00Z'))).toBeNull();
  });
});

describe('sniffImageMime', () => {
  it('recognises the formats the library accepts', () => {
    expect(sniffImageMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(sniffImageMime(pngBytes())).toBe('image/png');
    expect(sniffImageMime(Buffer.from('GIF89a', 'latin1'))).toBe('image/gif');
    expect(
      sniffImageMime(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')])),
    ).toBe('image/webp');
    expect(
      sniffImageMime(
        Buffer.concat([
          Buffer.alloc(4),
          Buffer.from('ftyp'),
          Buffer.from('avif'),
          Buffer.alloc(4),
        ]),
      ),
    ).toBe('image/avif');
  });

  it('rejects SVG and HTML payloads renamed to an image', () => {
    expect(sniffImageMime(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(sniffImageMime(Buffer.from('<!DOCTYPE html><script>alert(1)</script>'))).toBeNull();
    expect(sniffImageMime(Buffer.alloc(0))).toBeNull();
  });
});

describe('LocalMediaStorage', () => {
  it('presigns an upload URL that carries the site it may write to', async () => {
    const storage = new LocalMediaStorage('/tmp/lumio-test', SECRET, 'https://api.example.com', 60000);
    const presigned = await storage.presign(TICKET);

    expect(presigned.url.startsWith('https://api.example.com/api/v1/media/upload/')).toBe(true);
    expect(presigned.headers['content-type']).toBe('image/jpeg');
    expect(storage.verify(new URL(presigned.url).pathname.split('/').pop() ?? '')).toEqual(TICKET);
  });

  it('writes, reads, sniffs and removes a file through the driver', async () => {
    const root = await mkdtemp(join(tmpdir(), 'lumio-media-'));
    try {
      const storage = new LocalMediaStorage(root, SECRET, 'http://localhost:49100', 60000);
      await storage.put(TICKET.key, pngBytes(), 'image/png');

      expect(await storage.size(TICKET.key)).toBe(pngBytes().length);
      expect(await storage.read(TICKET.key)).toEqual(pngBytes());
      // Only the leading bytes are read, and they are enough to sniff the type.
      const head = await storage.readHead(TICKET.key, 8);
      expect(head).toEqual(pngBytes().subarray(0, 8));
      expect(sniffImageMime(head ?? Buffer.alloc(0))).toBe('image/png');

      await storage.remove(TICKET.key);
      expect(await storage.read(TICKET.key)).toBeNull();
      expect(await storage.readHead(TICKET.key, 8)).toBeNull();
      expect(await storage.size(TICKET.key)).toBeNull();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('never writes outside its root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'lumio-media-'));
    try {
      const storage = new LocalMediaStorage(root, SECRET, 'http://localhost:49100', 60000);
      await expect(storage.put('../escape.png', pngBytes(), 'image/png')).rejects.toThrow(
        /escapes the storage root/,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('format helpers', () => {
  it('maps mime types to file extensions and back', () => {
    expect(extensionForMime('image/jpeg')).toBe('jpg');
    expect(extensionForMime('image/avif')).toBe('avif');
    expect(mimeForFormat('webp')).toBe('image/webp');
    expect(mimeForFormat('avif')).toBe('image/avif');
    expect(mimeForFormat('png')).toBe('image/png');
  });
});

describe('mediaUploadSecret', () => {
  it('uses a configured secret when there is one', () => {
    vi.stubEnv('MEDIA_UPLOAD_SECRET', 'real-secret');
    try {
      expect(mediaUploadSecret()).toBe('real-secret');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('refuses to sign upload URLs in production with no secret configured', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('MEDIA_UPLOAD_SECRET', '');
    vi.stubEnv('JWT_ACCESS_SECRET', '');
    try {
      expect(() => mediaUploadSecret()).toThrow(/MEDIA_UPLOAD_SECRET/);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
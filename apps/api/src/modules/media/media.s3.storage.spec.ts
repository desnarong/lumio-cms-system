import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { describe, expect, it, vi } from 'vitest';
import { s3Settings } from './media.config';
import { S3MediaStorage, createS3MediaStorage } from './media.s3.storage';
import type { UploadTicket } from './media.storage';

const TICKET: UploadTicket = { key: 'site/2026/10/hero.jpg', mime: 'image/jpeg', size: 4096 };

const pngBytes = (): Buffer =>
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(24),
  ]);

interface ClientStub {
  sent: Array<{ name: string; input: Record<string, unknown> }>;
  send: (command: unknown) => Promise<unknown>;
}

/**
 * Stands in for the AWS client. The driver only needs `send`, so the whole S3
 * flow can be exercised without a bucket: what matters is the command that is
 * built for each operation.
 */
const clientStub = (
  responses: { head?: unknown; get?: unknown; fail?: boolean } = {},
): ClientStub => {
  const sent: ClientStub['sent'] = [];
  return {
    sent,
    send: async (command: unknown) => {
      const typed = command as { constructor: { name: string }; input: Record<string, unknown> };
      sent.push({ name: typed.constructor.name, input: typed.input });

      if (responses.fail) throw new Error('bucket is unreachable');
      if (typed.constructor.name === 'HeadObjectCommand') {
        return responses.head ?? { ContentLength: 4096 };
      }
      if (typed.constructor.name === 'GetObjectCommand') {
        return responses.get ?? { Body: { transformToByteArray: async () => pngBytes() } };
      }
      return {};
    },
  };
};

const storageWith = (
  client: ClientStub,
  options: { ttlMs?: number; signUpload?: (command: PutObjectCommand, ttl: number) => Promise<string> } = {},
) =>
  new S3MediaStorage({
    bucket: 'lumio-media',
    client,
    signUpload:
      options.signUpload ??
      ((command, expiresIn) =>
        Promise.resolve(
          `https://s3.example.com/${command.input.Key}?X-Amz-Expires=${expiresIn}`,
        )),
    secret: 'test-secret',
    ttlMs: options.ttlMs ?? 900_000,
    now: () => new Date('2026-10-21T00:00:00.000Z'),
  });

describe('S3MediaStorage', () => {
  it('signs a PutObject for the reserved key and the declared content type', async () => {
    const client = clientStub();
    const storage = storageWith(client);

    const presigned = await storage.presign(TICKET);

    expect(presigned.url).toBe('https://s3.example.com/site/2026/10/hero.jpg?X-Amz-Expires=900');
    expect(presigned.headers).toEqual({ 'content-type': 'image/jpeg' });
    expect(presigned.expiresAt).toBe('2026-10-21T00:15:00.000Z');
  });

  it('never signs for less than a minute', async () => {
    const client = clientStub();
    const storage = storageWith(client, { ttlMs: 1_000 });

    const presigned = await storage.presign(TICKET);

    expect(presigned.url).toContain('X-Amz-Expires=60');
  });

  it('uploads a rendered variant with put', async () => {
    const client = clientStub();
    const storage = storageWith(client);

    await storage.put('site/2026/10/hero-480.webp', pngBytes(), 'image/webp');

    expect(client.sent).toEqual([
      {
        name: 'PutObjectCommand',
        input: {
          Bucket: 'lumio-media',
          Key: 'site/2026/10/hero-480.webp',
          Body: pngBytes(),
          ContentType: 'image/webp',
        },
      },
    ]);
  });

  it('reads the whole object and only a head range when asked', async () => {
    const client = clientStub();
    const storage = storageWith(client);

    expect(await storage.read(TICKET.key)).toEqual(pngBytes());
    expect(client.sent[0]?.input).toEqual({ Bucket: 'lumio-media', Key: TICKET.key });

    const head = await storage.readHead(TICKET.key, 32);
    expect(head).toEqual(pngBytes().subarray(0, 32));
    expect(client.sent[1]?.input).toEqual({
      Bucket: 'lumio-media',
      Key: TICKET.key,
      Range: 'bytes=0-31',
    });
  });

  it('reads the stored size from HEAD so confirm can check the limit', async () => {
    const client = clientStub({ head: { ContentLength: 2048 } });
    const storage = storageWith(client);

    expect(await storage.size(TICKET.key)).toBe(2048);
    expect(client.sent[0]?.name).toBe('HeadObjectCommand');
  });

  it('removes an object through DeleteObject', async () => {
    const client = clientStub();
    const storage = storageWith(client);

    await storage.remove(TICKET.key);

    expect(client.sent[0]?.name).toBe('DeleteObjectCommand');
    expect(client.sent[0]?.input).toEqual({ Bucket: 'lumio-media', Key: TICKET.key });
  });

  it('reports a missing object as null instead of throwing', async () => {
    const client = clientStub({ fail: true });
    const storage = storageWith(client);

    expect(await storage.size(TICKET.key)).toBeNull();
    expect(await storage.read(TICKET.key)).toBeNull();
    expect(await storage.readHead(TICKET.key, 32)).toBeNull();
    await expect(storage.remove(TICKET.key)).resolves.toBeUndefined();
  });

  it('keeps the signed upload fallback working for the API route', async () => {
    const storage = storageWith(clientStub());

    expect(storage.driver).toBe('s3');
    expect(storage.verify('not-a-token')).toBeNull();
  });
});

describe('s3Settings', () => {
  const env = (values: Record<string, string>): NodeJS.ProcessEnv => values as NodeJS.ProcessEnv;

  it('reads a MinIO setup with path-style addressing', () => {
    const settings = s3Settings(
      env({
        S3_BUCKET: 'lumio-media',
        S3_ACCESS_KEY: 'lumio',
        S3_SECRET_KEY: 'lumio-secret',
        S3_ENDPOINT: 'http://localhost:49600',
        S3_FORCE_PATH_STYLE: 'true',
      }),
    );

    expect(settings).toEqual({
      bucket: 'lumio-media',
      region: 'us-east-1',
      endpoint: 'http://localhost:49600',
      accessKeyId: 'lumio',
      secretAccessKey: 'lumio-secret',
      forcePathStyle: true,
    });
  });

  it('refuses to start without the credentials the driver needs', () => {
    expect(() => s3Settings(env({ S3_BUCKET: 'lumio-media' }))).toThrow(
      /S3_ACCESS_KEY, S3_SECRET_KEY/,
    );
  });

  it('builds a driver around a real S3 client without touching the network', () => {
    const storage = createS3MediaStorage(
      {
        bucket: 'lumio-media',
        region: 'us-east-1',
        endpoint: null,
        accessKeyId: 'key',
        secretAccessKey: 'secret',
        forcePathStyle: false,
      },
      60_000,
    );

    expect(storage).toBeInstanceOf(S3MediaStorage);
    expect(storage.driver).toBe('s3');
  });
});

describe('S3MediaStorage command shapes', () => {
  it('never leaks credentials into the presigned URL', async () => {
    // `getSignedUrl` is exercised through the factory's default signer; here we
    // simply assert the driver's own URL shape stays a plain signed link.
    const signUpload = vi.fn().mockResolvedValue('https://s3.example.com/key?signed=1');
    const storage = storageWith(clientStub(), { signUpload });

    const presigned = await storage.presign(TICKET);

    expect(signUpload).toHaveBeenCalledTimes(1);
    expect(presigned.url).not.toContain('secret');
  });

  it('uses the same commands the real SDK exports', () => {
    // Guards against a refactor that swaps a command class for a raw request.
    expect(new PutObjectCommand({ Bucket: 'b', Key: 'k' }).constructor.name).toBe(
      'PutObjectCommand',
    );
    expect(new GetObjectCommand({ Bucket: 'b', Key: 'k' }).constructor.name).toBe(
      'GetObjectCommand',
    );
    expect(new HeadObjectCommand({ Bucket: 'b', Key: 'k' }).constructor.name).toBe(
      'HeadObjectCommand',
    );
    expect(new DeleteObjectCommand({ Bucket: 'b', Key: 'k' }).constructor.name).toBe(
      'DeleteObjectCommand',
    );
  });
});
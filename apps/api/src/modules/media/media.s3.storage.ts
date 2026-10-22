import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { mediaUploadSecret, mediaUploadTtlMs, s3Settings } from './media.config';
import {
  verifyUploadToken,
  type MediaStorage,
  type PresignedUpload,
  type UploadTicket,
} from './media.storage';

/** The slice of the S3 client this driver uses, so tests can pass a stub. */
export interface S3ClientLike {
  send(
    command: DeleteObjectCommand | GetObjectCommand | HeadObjectCommand | PutObjectCommand,
  ): Promise<unknown>;
}

/** Signs one `PutObject` request; bound to a client by the factory below. */
export type SignUpload = (
  command: PutObjectCommand,
  expiresInSeconds: number,
) => Promise<string>;

export interface S3StorageOptions {
  bucket: string;
  client: S3ClientLike;
  signUpload: SignUpload;
  secret?: string;
  ttlMs?: number;
  now?: () => Date;
}

interface GetObjectBody {
  transformToByteArray(): Promise<Uint8Array>;
}

/**
 * S3/MinIO driver (docs/design/18-deployment.md). It implements the same
 * {@link MediaStorage} contract as the local driver, so the media service, the
 * render pipeline and the admin client are unchanged: `presign` returns a
 * signed `PutObject` URL the browser writes to directly, and the variant files
 * the worker renders are uploaded with `put`.
 *
 * The declared size cannot be enforced by a presigned PUT, so `MediaService`
 * re-checks the stored object and sniffs its first bytes before accepting it
 * (docs/design/15-security.md).
 */
export class S3MediaStorage implements MediaStorage {
  readonly driver = 's3' as const;

  private readonly bucket: string;
  private readonly client: S3ClientLike;
  private readonly signUpload: SignUpload;
  private readonly secret: string;
  private readonly ttlMs: number;
  private readonly now: () => Date;

  constructor(options: S3StorageOptions) {
    this.bucket = options.bucket;
    this.client = options.client;
    this.signUpload = options.signUpload;
    this.secret = options.secret ?? mediaUploadSecret();
    this.ttlMs = options.ttlMs ?? mediaUploadTtlMs();
    this.now = options.now ?? (() => new Date());
  }

  async presign(ticket: UploadTicket): Promise<PresignedUpload> {
    const expiresInSeconds = Math.max(60, Math.round(this.ttlMs / 1000));
    const url = await this.signUpload(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: ticket.key,
        // Signed, so the browser cannot upload a different format and the
        // object is served with a correct content type.
        ContentType: ticket.mime,
      }),
      expiresInSeconds,
    );

    return {
      url,
      expiresAt: new Date(this.now().getTime() + this.ttlMs).toISOString(),
      headers: { 'content-type': ticket.mime },
    };
  }

  /**
   * Kept for the API upload fallback (`PUT /v1/media/upload/:token`), which
   * lets a browser that cannot reach the bucket still finish an upload.
   */
  verify(token: string, now: Date = new Date()): UploadTicket | null {
    return verifyUploadToken(token, this.secret, now);
  }

  async put(key: string, body: Buffer, mime: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: mime,
      }),
    );
  }

  async read(key: string): Promise<Buffer | null> {
    const body = await this.fetchObject(key);
    if (!body) return null;
    return Buffer.from(await body.transformToByteArray());
  }

  async readHead(key: string, bytes: number): Promise<Buffer | null> {
    const body = await this.fetchObject(key, `bytes=0-${Math.max(0, bytes - 1)}`);
    if (!body) return null;
    return Buffer.from(await body.transformToByteArray());
  }

  async size(key: string): Promise<number | null> {
    try {
      const output = (await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      )) as { ContentLength?: number };
      return typeof output.ContentLength === 'number' ? output.ContentLength : null;
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch {
      // Deleting something that is already gone is not an error for the caller.
    }
  }

  private async fetchObject(key: string, range?: string): Promise<GetObjectBody | null> {
    try {
      const output = (await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
          ...(range ? { Range: range } : {}),
        }),
      )) as { Body?: GetObjectBody };
      return output.Body ?? null;
    } catch {
      return null;
    }
  }
}

/** Builds the driver from the `S3_*` environment (see `s3Settings`). */
export const createS3MediaStorage = (
  settings: ReturnType<typeof s3Settings> = s3Settings(),
  ttlMs: number = mediaUploadTtlMs(),
): S3MediaStorage => {
  const client = new S3Client({
    region: settings.region,
    ...(settings.endpoint ? { endpoint: settings.endpoint } : {}),
    forcePathStyle: settings.forcePathStyle,
    credentials: {
      accessKeyId: settings.accessKeyId,
      secretAccessKey: settings.secretAccessKey,
    },
  });

  return new S3MediaStorage({
    bucket: settings.bucket,
    client,
    signUpload: (command, expiresIn) => getSignedUrl(client, command, { expiresIn }),
    ttlMs,
  });
};
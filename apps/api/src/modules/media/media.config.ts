import { join } from 'node:path';

/**
 * Environment wiring for the media library (docs/design/12-api.md 12.6).
 * Keeping it in one place means the upload URL, the public CDN base and the
 * storage directory can never drift apart.
 */

export const apiPublicUrl = (): string =>
  (process.env.API_PUBLIC_URL ?? `http://localhost:${process.env.API_PORT ?? '49100'}`).replace(
    /\/+$/,
    '',
  );

/**
 * Where `Img` and the admin library load files from. Production points this at
 * the CDN; development serves the local driver from the API itself, so the
 * presigned flow works end to end without object storage.
 */
export const mediaPublicBaseUrl = (): string =>
  (process.env.MEDIA_PUBLIC_BASE_URL?.trim() || `${apiPublicUrl()}/media`).replace(/\/+$/, '');

export const mediaLocalDir = (): string =>
  process.env.MEDIA_LOCAL_DIR?.trim() || join(process.cwd(), '.media');

/**
 * Signs presigned upload URLs. There is a development fallback so `pnpm dev`
 * works out of the box, but production must configure a real secret: refusing
 * to start is better than signing upload URLs with a value from the repository.
 */
export const mediaUploadSecret = (): string => {
  const secret =
    process.env.MEDIA_UPLOAD_SECRET?.trim() || process.env.JWT_ACCESS_SECRET?.trim() || '';
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('ต้องตั้งค่า MEDIA_UPLOAD_SECRET ก่อนรันในโหมด production');
  }
  return 'lumio-media-dev-secret';
};

export const mediaUploadTtlMs = (): number => {
  const minutes = Number(process.env.MEDIA_UPLOAD_TTL_MINUTES ?? '15');
  return (Number.isFinite(minutes) && minutes > 0 ? minutes : 15) * 60_000;
};

/** The API drains media jobs itself unless the worker owns them. */
export const mediaInlineEnabled = (): boolean => process.env.MEDIA_INLINE !== 'false';

/**
 * Cap on decoded pixels for every sharp call. A small file can declare a huge
 * canvas, so the byte-size limit on uploads alone does not stop a decompression
 * bomb (docs/design/15-security.md 15.3).
 */
export const mediaMaxInputPixels = (): number => {
  const value = Number(process.env.MEDIA_MAX_INPUT_PIXELS ?? '40000000');
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 40_000_000;
};

export const mediaStorageDriver = (): 'local' | 's3' =>
  process.env.MEDIA_STORAGE === 's3' ? 's3' : 'local';

export interface S3Settings {
  bucket: string;
  region: string;
  endpoint: string | null;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

/**
 * Object storage settings (docs/design/18-deployment.md). MinIO in development
 * and S3 in production differ only by endpoint/forcePathStyle, so one set of
 * variables covers both. Choosing the `s3` driver without them is a
 * configuration mistake that must stop the process instead of silently writing
 * to a bucket named "undefined".
 */
export const s3Settings = (env: NodeJS.ProcessEnv = process.env): S3Settings => {
  const read = (name: string): string => (env[name] ?? '').trim();
  const bucket = read('S3_BUCKET');
  const accessKeyId = read('S3_ACCESS_KEY');
  const secretAccessKey = read('S3_SECRET_KEY');

  const missing = [
    bucket ? null : 'S3_BUCKET',
    accessKeyId ? null : 'S3_ACCESS_KEY',
    secretAccessKey ? null : 'S3_SECRET_KEY',
  ].filter((name): name is string => name !== null);
  if (missing.length > 0) {
    throw new Error(`ตั้งค่า S3 ไม่ครบ ต้องระบุ ${missing.join(', ')} ก่อนใช้ MEDIA_STORAGE=s3`);
  }

  return {
    bucket,
    region: read('S3_REGION') || 'us-east-1',
    endpoint: read('S3_ENDPOINT') || null,
    accessKeyId,
    secretAccessKey,
    // MinIO needs path-style addressing; AWS S3 prefers virtual-hosted style.
    forcePathStyle: read('S3_FORCE_PATH_STYLE') === 'true',
  };
};
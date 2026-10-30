import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Reader sessions (docs/PROGRESS.md batch A). A reader is the site's audience,
 * not a team member, so this token is deliberately separate from the admin
 * access token: it names one reader of one site and nothing else.
 *
 * The token is signed with the same HMAC approach as preview links, which keeps
 * it verifiable by the public delivery routes without any auth dependency.
 */

const MIN_SECRET_LENGTH = 16;
const DEFAULT_TTL_SECONDS = 30 * 24 * 60 * 60;

const secret = (): string =>
  (process.env.READER_SECRET ?? process.env.JWT_ACCESS_SECRET ?? '').trim();

/** Fails closed: without a configured secret no reader session can be created. */
export const readerSecretReady = (): boolean => secret().length >= MIN_SECRET_LENGTH;

const sign = (encoded: string, key: string): string =>
  createHmac('sha256', key).update(encoded, 'utf8').digest('base64url');

export const signReaderToken = (
  readerId: string,
  siteId: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
  now: number = Date.now(),
): { token: string; expiresAt: Date } => {
  const key = secret();
  if (key.length < MIN_SECRET_LENGTH) {
    throw new Error(
      'ยังไม่ได้ตั้งค่า READER_SECRET หรือ JWT_ACCESS_SECRET (อย่างน้อย 16 ตัวอักษร)',
    );
  }

  const expiresAt = new Date(now + Math.max(60, ttlSeconds) * 1_000);
  const payload = `${readerId}.${siteId}.${Math.floor(expiresAt.getTime() / 1_000)}`;
  const encoded = Buffer.from(payload, 'utf8').toString('base64url');
  return { token: `${encoded}.${sign(encoded, key)}`, expiresAt };
};

export interface ReaderClaim {
  readerId: string;
  siteId: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const verifyReaderToken = (token: string, now: number = Date.now()): ReaderClaim | null => {
  const key = secret();
  if (key.length < MIN_SECRET_LENGTH) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, provided] = parts as [string, string];

  const expected = sign(encoded, key);
  const providedBytes = Buffer.from(provided, 'utf8');
  const expectedBytes = Buffer.from(expected, 'utf8');
  if (
    providedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(providedBytes, expectedBytes)
  ) {
    return null;
  }

  let payload: string;
  try {
    payload = Buffer.from(encoded, 'base64url').toString('utf8');
  } catch {
    return null;
  }

  const [readerId, siteId, expires] = payload.split('.');
  if (!readerId || !siteId || !expires) return null;
  if (!UUID.test(readerId) || !UUID.test(siteId)) return null;

  const expiresAt = Number(expires);
  if (!Number.isFinite(expiresAt) || expiresAt * 1_000 <= now) return null;

  return { readerId, siteId };
};

/** Reads `Authorization: Bearer …` without throwing on a malformed header. */
export const bearerToken = (header: string | undefined): string | null => {
  if (!header) return null;
  const [scheme, value] = header.trim().split(/\s+/, 2);
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !value) return null;
  return value;
};

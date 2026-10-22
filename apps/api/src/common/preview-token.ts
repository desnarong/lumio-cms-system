import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Short-lived draft preview links (docs/design/10-architecture.md 10.4 step 3).
 * The token names one page of one site and expires; it never grants access to
 * anything else, so a link can be shared with a reviewer without signing in.
 */

const MIN_SECRET_LENGTH = 16;

const secret = (): string =>
  (process.env.PREVIEW_SECRET ?? process.env.JWT_ACCESS_SECRET ?? '').trim();

/** Fails closed: without a configured secret no preview link can be minted. */
export const previewSecretReady = (): boolean => secret().length >= MIN_SECRET_LENGTH;

export const signPreviewToken = (
  contentId: string,
  siteId: string,
  ttlSeconds = 3_600,
  now: number = Date.now(),
): { token: string; expiresAt: Date } => {
  const key = secret();
  if (key.length < MIN_SECRET_LENGTH) {
    throw new Error(
      'ยังไม่ได้ตั้งค่า PREVIEW_SECRET (อย่างน้อย 16 ตัวอักษร) จึงสร้างลิงก์ตัวอย่างไม่ได้',
    );
  }

  const expiresAt = new Date(now + Math.max(60, ttlSeconds) * 1_000);
  const payload = `${contentId}.${siteId}.${Math.floor(expiresAt.getTime() / 1_000)}`;
  const encoded = Buffer.from(payload, 'utf8').toString('base64url');
  const signature = createHmac('sha256', key).update(encoded, 'utf8').digest('base64url');
  return { token: `${encoded}.${signature}`, expiresAt };
};

export interface PreviewClaim {
  contentId: string;
  siteId: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const verifyPreviewToken = (
  token: string,
  now: number = Date.now(),
): PreviewClaim | null => {
  const key = secret();
  if (key.length < MIN_SECRET_LENGTH) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, provided] = parts as [string, string];

  const expected = createHmac('sha256', key).update(encoded, 'utf8').digest('base64url');
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

  const [contentId, siteId, expires] = payload.split('.');
  if (!contentId || !siteId || !expires) return null;
  if (!UUID.test(contentId) || !UUID.test(siteId)) return null;

  const expiresAt = Number(expires);
  if (!Number.isFinite(expiresAt) || expiresAt * 1_000 <= now) return null;

  return { contentId, siteId };
};

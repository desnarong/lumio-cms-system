import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Time-based one-time passwords for admin sign-in (docs/design/15-security.md).
 * RFC 6238 with the defaults every authenticator app expects: SHA-1, 30-second
 * steps, 6 digits. No dependency: it is a small, well-specified HMAC.
 */

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const CODE_DIGITS = 6;
const STEP_SECONDS = 30;
/** One step of clock drift either way, so a phone that is slightly off still works. */
const DEFAULT_WINDOW = 1;

export const base32Encode = (buffer: Buffer): string => {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
};

export const base32Decode = (input: string): Buffer => {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index < 0) continue;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
};

/** A fresh shared secret (160 bits, the size authenticator apps expect). */
export const generateTotpSecret = (bytes = 20): string => base32Encode(randomBytes(bytes));

/** The code for one moment in time; exported so tests can use the RFC vectors. */
export const totpCode = (
  secret: string,
  atMs: number = Date.now(),
  digits = CODE_DIGITS,
  stepSeconds = STEP_SECONDS,
): string => {
  const counter = Math.floor(atMs / 1000 / stepSeconds);
  const message = Buffer.alloc(8);
  message.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  message.writeUInt32BE(counter % 2 ** 32, 4);

  const digest = createHmac('sha1', base32Decode(secret)).update(message).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);

  return String(binary % 10 ** digits).padStart(digits, '0');
};

const safeEqual = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

/** True when `code` matches the current step (or one step either side). */
export const verifyTotp = (
  secret: string,
  code: string,
  atMs: number = Date.now(),
  window = DEFAULT_WINDOW,
  stepSeconds = STEP_SECONDS,
): boolean => {
  const candidate = code.trim();
  if (!/^\d{6}$/.test(candidate)) return false;

  const step = stepSeconds * 1000;
  for (let offset = -window; offset <= window; offset += 1) {
    if (safeEqual(candidate, totpCode(secret, atMs + offset * step, CODE_DIGITS, stepSeconds))) {
      return true;
    }
  }
  return false;
};

/** The `otpauth://` URI an authenticator app imports (or a QR encoder draws). */
export const otpauthUrl = (input: {
  secret: string;
  account: string;
  issuer?: string;
  digits?: number;
  stepSeconds?: number;
}): string => {
  const issuer = input.issuer ?? 'Lumio';
  const label = `${issuer}:${input.account}`;
  const params = new URLSearchParams({
    secret: input.secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(input.digits ?? CODE_DIGITS),
    period: String(input.stepSeconds ?? STEP_SECONDS),
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
};

/** Ten `XXXX-XXXX` codes: short enough to type, long enough to guess-proof. */
export const generateRecoveryCodes = (count = 10): string[] =>
  Array.from({ length: count }, () => {
    const raw = base32Encode(randomBytes(5)).slice(0, 8);
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });

/** Only hashes are stored; the plaintext is shown once when 2FA is enabled. */
export const hashRecoveryCode = (code: string): string =>
  createHash('sha256').update(code.replace(/[\s-]/g, '').toUpperCase()).digest('hex');

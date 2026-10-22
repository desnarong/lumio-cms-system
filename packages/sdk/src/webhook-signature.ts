/**
 * Signature helpers for Lumio webhooks (docs/design/12-api.md 12.7).
 *
 * Every delivery carries `x-lumio-timestamp` and
 * `x-lumio-signature: sha256=<hex>` computed over `<timestamp>.<raw body>` with
 * the secret the shop owner set. Receivers should call
 * {@link verifyLumioSignature} before trusting a payload.
 *
 * Web Crypto is used so the same code runs in a browser, a Node/Deno/Bun
 * server, and an edge worker; there is no dependency and no Node-only import.
 */

export interface VerifyLumioSignatureInput {
  /** The signing secret from the shop's webhook settings. */
  secret: string;
  /** `x-lumio-timestamp` header, Unix seconds. */
  timestamp: string | number;
  /** The raw request body exactly as received (do not re-serialise JSON). */
  body: string;
  /** `x-lumio-signature` header, `sha256=<hex>`. */
  header: string;
  /** Reject old deliveries; default 5 minutes. */
  toleranceSeconds?: number;
  /** Override "now" for tests, in milliseconds. */
  now?: number;
}

const encoder = new TextEncoder();

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

/** Length-independent comparison, so a mismatch never leaks timing. */
const sameHex = (left: string, right: string): boolean => {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
};

const hmacSha256 = async (secret: string, message: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return toHex(new Uint8Array(signature));
};

/** The header value Lumio would send; useful for building a test receiver. */
export const lumioSignatureHeader = async ({
  secret,
  timestamp,
  body,
}: Pick<VerifyLumioSignatureInput, 'secret' | 'timestamp' | 'body'>): Promise<string> => {
  const mac = await hmacSha256(secret, `${timestamp}.${body}`);
  return `sha256=${mac}`;
};

export const verifyLumioSignature = async (
  input: VerifyLumioSignatureInput,
): Promise<boolean> => {
  if (input.secret.length === 0) return false;

  const match = /^sha256=([0-9a-f]{64})$/i.exec(input.header.trim());
  if (!match) return false;

  const timestamp = Number(input.timestamp);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return false;

  const nowSeconds = Math.floor((input.now ?? Date.now()) / 1000);
  const tolerance = input.toleranceSeconds ?? 300;
  if (Math.abs(nowSeconds - timestamp) > tolerance) return false;

  const expected = await hmacSha256(input.secret, `${timestamp}.${input.body}`);
  return sameHex(expected, match[1]!.toLowerCase());
};

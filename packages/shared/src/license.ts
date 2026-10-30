import { z } from 'zod';

/**
 * Deployment licences for paid capabilities (docs/design/24-community-licensing.md).
 *
 * The Community edition ships this verifier only. A licence is an Ed25519-signed
 * token the vendor issues; the private key never leaves the vendor, so a build
 * cannot mint its own paid features. Verification is offline: no call home.
 */
export const LICENSE_FEATURES = ['membership', 'marketplace', 'whitelabel'] as const;
export type LicenseFeature = (typeof LICENSE_FEATURES)[number];

export const isLicenseFeature = (value: unknown): value is LicenseFeature =>
  typeof value === 'string' && (LICENSE_FEATURES as readonly string[]).includes(value);

/** `lumio_lic_v1.<base64url payload>.<base64url signature>` */
export const LICENSE_TOKEN_PREFIX = 'lumio_lic_v1.';

export const LICENSE_TOKEN_PATTERN = /^lumio_lic_v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export const licensePayloadSchema = z.object({
  v: z.literal(1),
  /** Who bought the licence: a company or person, shown in the admin. */
  sub: z.string().trim().min(1).max(200),
  plan: z.enum(['pro', 'business']).default('pro'),
  /** Paid capabilities the licence unlocks; empty means none. */
  features: z.array(z.enum(LICENSE_FEATURES)).default([]),
  /** How many sites the licence covers; null/absent means unlimited. */
  seats: z.number().int().min(1).max(100_000).nullable().optional(),
  /** Issued at, Unix seconds. */
  iat: z.number().int().nonnegative(),
  /** Expiry, Unix seconds; null or absent means perpetual. */
  exp: z.number().int().nonnegative().nullable().optional(),
});
export type LicensePayload = z.infer<typeof licensePayloadSchema>;

export const LICENSE_REASONS = [
  'ok',
  'missing',
  'malformed',
  'bad_signature',
  'expired',
  'no_public_key',
] as const;
export type LicenseReason = (typeof LICENSE_REASONS)[number];

export const licenseStatusSchema = z.object({
  edition: z.enum(['community', 'pro']),
  valid: z.boolean(),
  plan: z.enum(['community', 'pro', 'business']),
  subject: z.string().nullable(),
  features: z.array(z.enum(LICENSE_FEATURES)),
  seats: z.number().int().nullable(),
  issuedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  reason: z.enum(LICENSE_REASONS),
});
export type LicenseStatus = z.infer<typeof licenseStatusSchema>;

export const verifyLicenseInputSchema = z.object({
  token: z.string().trim().min(1).max(4096),
});
export type VerifyLicenseInput = z.infer<typeof verifyLicenseInputSchema>;

export const licenseStatusOfPayload = (payload: LicensePayload): LicenseStatus => ({
  edition: 'pro',
  valid: true,
  plan: payload.plan,
  subject: payload.sub,
  features: payload.features,
  seats: payload.seats ?? null,
  issuedAt: new Date(payload.iat * 1000).toISOString(),
  expiresAt: payload.exp === null || payload.exp === undefined ? null : new Date(payload.exp * 1000).toISOString(),
  reason: 'ok',
});

export const communityStatus = (reason: LicenseReason = 'missing'): LicenseStatus => ({
  edition: 'community',
  valid: false,
  plan: 'community',
  subject: null,
  features: [],
  seats: null,
  issuedAt: null,
  expiresAt: null,
  reason,
});

export const isLicenseExpired = (payload: LicensePayload, nowMs: number = Date.now()): boolean =>
  typeof payload.exp === 'number' && payload.exp * 1000 <= nowMs;

export interface ParsedLicenseToken {
  /** The exact text the signature covers. */
  signingInput: string;
  /** Raw Ed25519 signature bytes. */
  signature: Uint8Array;
  payload: LicensePayload;
}

const decodeBase64Url = (value: string): Uint8Array => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const utf8 = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

/**
 * Splits a token and validates the payload. Signature maths happens on the
 * server, where the public key lives; this half is safe to reuse in a browser.
 */
export const parseLicenseToken = (
  token: string,
): { ok: true; parsed: ParsedLicenseToken } | { ok: false; reason: LicenseReason } => {
  if (!LICENSE_TOKEN_PATTERN.test(token)) return { ok: false, reason: 'malformed' };

  const [prefix, payloadSegment, signatureSegment] = token.split('.');
  if (prefix !== 'lumio_lic_v1' || !payloadSegment || !signatureSegment) {
    return { ok: false, reason: 'malformed' };
  }

  try {
    const payload = licensePayloadSchema.parse(JSON.parse(utf8(decodeBase64Url(payloadSegment))));
    const signature = decodeBase64Url(signatureSegment);
    if (signature.length !== 64) return { ok: false, reason: 'malformed' };
    return {
      ok: true,
      parsed: { signingInput: `${prefix}.${payloadSegment}`, signature, payload },
    };
  } catch {
    return { ok: false, reason: 'malformed' };
  }
};

/** True when a verified licence includes the paid capability. */
export const licenseCoversFeature = (
  status: LicenseStatus | null | undefined,
  feature: LicenseFeature,
): boolean => Boolean(status?.valid && status.features.includes(feature));

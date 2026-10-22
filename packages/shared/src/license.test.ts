import { describe, expect, it } from 'vitest';
import {
  communityStatus,
  isLicenseExpired,
  licenseCoversFeature,
  licenseStatusOfPayload,
  parseLicenseToken,
  type LicensePayload,
} from './license.js';

const payload = (overrides: Partial<LicensePayload> = {}): LicensePayload => ({
  v: 1,
  sub: 'บริษัท ตัวอย่าง จำกัด',
  plan: 'pro',
  features: ['membership'],
  seats: 5,
  iat: 1_760_000_000,
  exp: 2_000_000_000,
  ...overrides,
});

const encode = (value: unknown): string =>
  Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');

const token = (payloadValue: unknown, signature = 'a'.repeat(86)): string => {
  const segment = encode(payloadValue);
  return `lumio_lic_v1.${segment}.${signature}`;
};

describe('parseLicenseToken', () => {
  it('splits a token into the signed text and its payload', () => {
    const parsed = parseLicenseToken(token(payload()));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.parsed.payload).toMatchObject({ sub: 'บริษัท ตัวอย่าง จำกัด', plan: 'pro' });
    expect(parsed.parsed.signingInput.startsWith('lumio_lic_v1.')).toBe(true);
  });

  it('rejects text that is not a Lumio licence', () => {
    expect(parseLicenseToken('license-key-123')).toEqual({ ok: false, reason: 'malformed' });
    expect(parseLicenseToken('lumio_lic_v1.abc')).toEqual({ ok: false, reason: 'malformed' });
  });

  it('rejects a payload that does not follow the schema', () => {
    expect(parseLicenseToken(token({ v: 2, sub: 'x' }))).toEqual({
      ok: false,
      reason: 'malformed',
    });
  });

  it('rejects a signature that is not 64 bytes', () => {
    expect(parseLicenseToken(token(payload(), 'short'))).toEqual({
      ok: false,
      reason: 'malformed',
    });
  });
});

describe('licence status', () => {
  it('reads a paid licence as Pro', () => {
    const status = licenseStatusOfPayload(payload());

    expect(status).toMatchObject({
      edition: 'pro',
      valid: true,
      plan: 'pro',
      features: ['membership'],
      seats: 5,
      reason: 'ok',
    });
    expect(status.issuedAt).toBe(new Date(1_760_000_000 * 1000).toISOString());
  });

  it('explains why an unlicensed build is Community', () => {
    expect(communityStatus('missing')).toMatchObject({
      edition: 'community',
      valid: false,
      features: [],
      reason: 'missing',
    });
  });

  it('times out an expiring licence', () => {
    expect(isLicenseExpired(payload({ exp: 100 }), 200_000)).toBe(true);
    expect(isLicenseExpired(payload({ exp: 300 }), 200_000)).toBe(false);
    expect(isLicenseExpired(payload({ exp: null }), 200_000)).toBe(false);
  });

  it('unlocks only the capabilities the licence lists', () => {
    const status = licenseStatusOfPayload(payload({ features: ['marketplace'] }));

    expect(licenseCoversFeature(status, 'marketplace')).toBe(true);
    expect(licenseCoversFeature(status, 'membership')).toBe(false);
    expect(licenseCoversFeature(communityStatus(), 'membership')).toBe(false);
  });
});

import { generateKeyPairSync, sign } from 'node:crypto';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { LicensePayload } from '@lumio/shared';
import { LicenseService } from './license.service';

const encode = (value: unknown): string =>
  Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');

interface Keys {
  publicKey: string;
  sign: (segment: string) => string;
}

const keys = (): Keys => {
  const pair = generateKeyPairSync('ed25519');
  return {
    publicKey: pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64'),
    sign: (segment) =>
      sign(null, Buffer.from(segment, 'utf8'), pair.privateKey).toString('base64url'),
  };
};

const tokenFor = (pair: Keys, payload: LicensePayload): string => {
  const segment = encode(payload);
  const signingInput = `lumio_lic_v1.${segment}`;
  return `${signingInput}.${pair.sign(signingInput)}`;
};

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

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

describe('LicenseService', () => {
  let pair: Keys;
  let service: LicenseService;

  beforeAll(() => {
    pair = keys();
    process.env.LUMIO_LICENSE_PUBLIC_KEY = pair.publicKey;
    service = new LicenseService();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reports Community when no licence is installed', () => {
    vi.stubEnv('LUMIO_LICENSE', '');
    const status = service.status();

    expect(status).toMatchObject({ edition: 'community', valid: false, reason: 'missing' });
  });

  it('accepts a genuine token and exposes what it unlocks', () => {
    const status = service.verifyToken(tokenFor(pair, payload()));

    expect(status).toMatchObject({
      edition: 'pro',
      valid: true,
      plan: 'pro',
      subject: 'บริษัท ตัวอย่าง จำกัด',
      features: ['membership'],
      seats: 5,
      reason: 'ok',
    });
    expect(status.expiresAt).toBe(new Date(2_000_000_000 * 1000).toISOString());
  });

  it('rejects a token whose payload was edited', () => {
    const genuine = tokenFor(pair, payload());
    const [, segment, signature] = genuine.split('.');
    const forged = encode({ ...payload(), features: ['membership', 'marketplace'] });

    const status = service.verifyToken(`lumio_lic_v1.${forged}.${signature}`);

    expect(segment).not.toBe(forged);
    expect(status).toMatchObject({ edition: 'community', reason: 'bad_signature' });
  });

  it('rejects an expired licence', () => {
    const status = service.verifyToken(tokenFor(pair, payload({ exp: nowSeconds() - 60 })));

    expect(status).toMatchObject({ edition: 'community', valid: false, reason: 'expired' });
  });

  it('accepts a perpetual licence with no expiry', () => {
    const status = service.verifyToken(tokenFor(pair, payload({ exp: null })));

    expect(status).toMatchObject({ valid: true, expiresAt: null, reason: 'ok' });
  });

  it('answers malformed for text that is not a token', () => {
    expect(service.verifyToken('not-a-licence')).toMatchObject({ reason: 'malformed' });
  });

  it('cannot verify anything without the vendor public key', () => {
    vi.stubEnv('LUMIO_LICENSE_PUBLIC_KEY', '');
    const bare = new LicenseService();

    expect(bare.verifyToken(tokenFor(pair, payload()))).toMatchObject({
      edition: 'community',
      reason: 'no_public_key',
    });
  });

  it('answers whether one paid capability is licensed', () => {
    vi.stubEnv('LUMIO_LICENSE', tokenFor(pair, payload()));

    expect(service.hasFeature('membership')).toBe(true);
    expect(service.hasFeature('marketplace')).toBe(false);
  });
});

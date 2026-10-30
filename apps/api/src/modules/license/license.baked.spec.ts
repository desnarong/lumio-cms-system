import { createPrivateKey, generateKeyPairSync, sign } from 'node:crypto';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { LicensePayload } from '@lumio/shared';
import { LicenseService } from './license.service';

/**
 * The key baked into a release build must beat `LUMIO_LICENSE_PUBLIC_KEY`,
 * otherwise an operator could point the verifier at their own key, run with
 * `NODE_ENV=development`, and mint a licence. This suite pins a throwaway
 * vendor key into the module to prove the env cannot displace it.
 */
const { VENDOR_PUBLIC_KEY } = vi.hoisted(() => ({
  VENDOR_PUBLIC_KEY: 'MCowBQYDK2VwAyEAxTf11EZTpH0VI8rguwQF2jV22i8uYdlQcErhMMJZ0AU=',
}));

const VENDOR_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEILVvelF0h7tmp3tr/Lfr4qsQiYm//tv4fB5910GxjD5L
-----END PRIVATE KEY-----
`;

vi.mock('./license.keys', () => ({ LICENSE_PUBLIC_KEY: VENDOR_PUBLIC_KEY }));

const payload: LicensePayload = {
  v: 1,
  sub: 'บริษัท ตัวอย่าง จำกัด',
  plan: 'pro',
  features: ['membership'],
  seats: 5,
  iat: 1_760_000_000,
  exp: 2_000_000_000,
};

const tokenWith = (privateKey: ReturnType<typeof createPrivateKey>): string => {
  const segment = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signingInput = `lumio_lic_v1.${segment}`;
  const signature = sign(null, Buffer.from(signingInput, 'utf8'), privateKey);
  return `${signingInput}.${signature.toString('base64url')}`;
};

const operatorKey = (): { publicKey: string; privateKey: ReturnType<typeof createPrivateKey> } => {
  const pair = generateKeyPairSync('ed25519');
  return {
    publicKey: pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64'),
    privateKey: pair.privateKey,
  };
};

describe('LicenseService with a baked vendor key', () => {
  let service: LicenseService;

  beforeAll(() => {
    service = new LicenseService();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('ignores an operator-supplied key and rejects tokens it signed', () => {
    const attacker = operatorKey();
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('LUMIO_LICENSE_PUBLIC_KEY', attacker.publicKey);

    expect(service.verifyToken(tokenWith(attacker.privateKey))).toMatchObject({
      edition: 'community',
      reason: 'bad_signature',
    });
  });

  it('still accepts a token signed by the baked vendor key', () => {
    vi.stubEnv('LUMIO_LICENSE_PUBLIC_KEY', operatorKey().publicKey);

    expect(service.verifyToken(tokenWith(createPrivateKey(VENDOR_PRIVATE_KEY)))).toMatchObject({
      edition: 'pro',
      valid: true,
      features: ['membership'],
    });
  });
});

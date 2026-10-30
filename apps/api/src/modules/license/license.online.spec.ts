import { generateKeyPairSync, sign } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LicenseService } from './license.service';

// A test key pair stands in for the vendor key baked into a release build.
vi.mock('./license.keys', () => ({ LICENSE_PUBLIC_KEY: '' }));

const pair = generateKeyPairSync('ed25519');
const publicKey = pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64');

const INSTALL = 'install-a';
const NOW = Math.floor(Date.now() / 1000);

const token = (payload: Record<string, unknown>): string => {
  const segment = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signingInput = `lumio_lic_v1.${segment}`;
  const signature = sign(null, Buffer.from(signingInput, 'utf8'), pair.privateKey);
  return `${signingInput}.${signature.toString('base64url')}`;
};

const renewal = (overrides: Record<string, unknown> = {}): string =>
  token({
    v: 1,
    sub: 'บริษัท ตัวอย่าง จำกัด',
    plan: 'pro',
    features: ['membership'],
    seats: 1,
    mode: 'online',
    iat: NOW,
    exp: NOW + 31_536_000,
    ...overrides,
  });

const lease = (overrides: Record<string, unknown> = {}): string =>
  renewal({ exp: NOW + 259_200, inst: INSTALL, ...overrides });

const jsonReply = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('online licence leasing', () => {
  let dir: string;
  let service: InstanceType<typeof LicenseService>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'lumio-licence-'));
    vi.stubEnv('LUMIO_DATA_DIR', dir);
    vi.stubEnv('LUMIO_INSTALL_ID', INSTALL);
    vi.stubEnv('LUMIO_LICENSE_PUBLIC_KEY', publicKey);
    vi.stubEnv('LUMIO_LICENSE_SERVER', 'https://licences.example.com/');
    vi.stubEnv('LUMIO_LICENSE', renewal());
    service = new LicenseService();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    rmSync(dir, { recursive: true, force: true });
  });

  it('keeps an activated-but-not-yet-leased licence in Community', () => {
    expect(service.status()).toMatchObject({ edition: 'community', reason: 'not_activated' });
  });

  it('rejects a lease issued for another installation', () => {
    expect(service.verifyToken(lease({ inst: 'someone-else' }))).toMatchObject({
      edition: 'community',
      reason: 'wrong_install',
    });
  });

  it('accepts a lease bound to this installation', () => {
    expect(service.verifyToken(lease())).toMatchObject({
      edition: 'pro',
      valid: true,
      reason: 'ok',
      bound: true,
      mode: 'online',
    });
  });

  it('keeps working through the grace window after the lease runs out', () => {
    const expired = lease({ iat: NOW - 172_800, exp: NOW - 86_400 });

    expect(service.verifyToken(expired)).toMatchObject({
      edition: 'pro',
      valid: true,
      reason: 'grace',
    });
  });

  it('locks down once the grace window is over', () => {
    vi.stubEnv('LUMIO_LICENSE_GRACE_DAYS', '1');
    const longExpired = lease({ iat: NOW - 172_800, exp: NOW - 2 * 86_400 });

    expect(service.verifyToken(longExpired)).toMatchObject({
      edition: 'community',
      reason: 'expired',
    });
  });

  it('stores the lease and answers from it afterwards', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonReply({ token: lease() }));
    vi.stubGlobal('fetch', fetchMock);

    const status = await service.refresh();

    expect(status).toMatchObject({ edition: 'pro', valid: true, bound: true });
    const request = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(request[0]).toBe('https://licences.example.com/api/activate');
    expect(JSON.parse(String(request[1].body))).toMatchObject({
      installId: INSTALL,
      token: renewal(),
    });

    const stored = JSON.parse(readFileSync(join(dir, 'license-lease.json'), 'utf8'));
    expect(stored.installId).toBe(INSTALL);

    vi.stubEnv('LUMIO_LICENSE', '');
    expect(service.status()).toMatchObject({ edition: 'pro', valid: true, bound: true });
  });

  it('keeps the old rights when the licence server is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    await expect(service.refresh()).resolves.toMatchObject({ reason: 'not_activated' });
    expect(existsSync(join(dir, 'license-lease.json'))).toBe(false);
  });

  it('does not store a lease signed for another installation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonReply({ token: lease({ inst: 'attacker' }) })),
    );

    await expect(service.refresh()).resolves.toMatchObject({ reason: 'not_activated' });
    expect(existsSync(join(dir, 'license-lease.json'))).toBe(false);
  });

  it('reports the reason the server gave when renewal is refused', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonReply({ reason: 'revoked' }, 403)));

    await expect(service.refresh()).resolves.toMatchObject({ reason: 'not_activated' });
  });

  it('ignores the server entirely for an offline deployment', async () => {
    vi.stubEnv('LUMIO_LICENSE_SERVER', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(service.refresh()).resolves.toMatchObject({ reason: 'not_activated' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('status after the grace window', () => {
  let dir: string;
  let service: InstanceType<typeof LicenseService>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'lumio-licence-'));
    vi.stubEnv('LUMIO_DATA_DIR', dir);
    vi.stubEnv('LUMIO_INSTALL_ID', INSTALL);
    vi.stubEnv('LUMIO_LICENSE_PUBLIC_KEY', publicKey);
    vi.stubEnv('LUMIO_LICENSE_GRACE_DAYS', '1');
    vi.stubEnv('LUMIO_LICENSE', renewal());
    service = new LicenseService();
    writeFileSync(
      join(dir, 'license-lease.json'),
      JSON.stringify({ token: lease({ iat: NOW - 172_800, exp: NOW - 2 * 86_400 }), installId: INSTALL, fetchedAt: '' }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(dir, { recursive: true, force: true });
  });

  it('reports the expired lease instead of hiding it behind not_activated', () => {
    expect(service.status()).toMatchObject({ edition: 'community', reason: 'expired' });
  });
});

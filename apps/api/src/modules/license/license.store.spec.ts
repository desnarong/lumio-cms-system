import { generateKeyPairSync, sign } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import { LicenseService } from './license.service';
import { LicenseStore } from './license.store';

// A test key pair stands in for the vendor key baked into a release build.
vi.mock('./license.keys', () => ({ LICENSE_PUBLIC_KEY: '' }));

const pair = generateKeyPairSync('ed25519');
const publicKey = pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
const NOW = Math.floor(Date.now() / 1000);

const token = (payload: Record<string, unknown>): string => {
  const segment = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signingInput = `lumio_lic_v1.${segment}`;
  const signature = sign(null, Buffer.from(signingInput, 'utf8'), pair.privateKey);
  return `${signingInput}.${signature.toString('base64url')}`;
};

const offline = (overrides: Record<string, unknown> = {}): string =>
  token({
    v: 1,
    sub: 'บริษัท ตัวอย่าง จำกัด',
    plan: 'pro',
    features: ['membership', 'marketplace'],
    seats: 3,
    iat: NOW,
    exp: NOW + 31_536_000,
    ...overrides,
  });

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const USER_ID = '00000000-0000-4000-8000-000000000001';

describe('licence stored in the database', () => {
  let row: { id: string; token: string; updatedAt: Date } | null;
  let service: LicenseService;
  let store: LicenseStore;
  let auditLog: ReturnType<typeof vi.fn>;

  const db = {
    platformLicense: {
      findUnique: async () => row,
      upsert: async ({ create, update }: { create: { token: string }; update: { token: string } }) => {
        const next = create.token ?? update.token;
        row = { id: 'default', token: next, updatedAt: new Date() };
        return row;
      },
      deleteMany: async () => {
        row = null;
        return { count: 1 };
      },
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    row = null;
    vi.stubEnv('LUMIO_DATA_DIR', '');
    vi.stubEnv('LUMIO_LICENSE', '');
    vi.stubEnv('LUMIO_LICENSE_PUBLIC_KEY', publicKey);
    auditLog = vi.fn().mockResolvedValue(undefined);
    service = new LicenseService();
    store = new LicenseStore(db, { log: auditLog } as unknown as AuditService, service);
  });

  it('boots as Community when no licence is stored', async () => {
    await store.onModuleInit();

    expect(store.view()).toMatchObject({ edition: 'community', source: 'none', installedAt: null });
  });

  it('activates a stored licence on boot without touching .env', async () => {
    row = { id: 'default', token: offline(), updatedAt: new Date('2026-10-30T00:00:00Z') };
    await store.onModuleInit();

    expect(store.view()).toMatchObject({
      edition: 'pro',
      valid: true,
      plan: 'pro',
      features: ['membership', 'marketplace'],
      source: 'database',
      installedAt: '2026-10-30T00:00:00.000Z',
    });
  });

  it('keeps the token in the database and audits the install', async () => {
    const view = await store.install({ token: offline() }, USER_ID, SITE_ID);

    expect(view).toMatchObject({ edition: 'pro', source: 'database' });
    expect(row?.token).toBe(offline());
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'license.install', siteId: SITE_ID, userId: USER_ID }),
    );
    expect(service.hasFeature('marketplace')).toBe(true);
  });

  it('refuses a forged token and stores nothing', async () => {
    const forged = offline({ features: ['whitelabel'] });
    const [prefix, segment] = forged.split('.');
    const tampered = `${prefix}.${Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(segment ?? '', 'base64url').toString('utf8')), plan: 'business' }),
    ).toString('base64url')}.${forged.split('.')[2]}`;

    await expect(store.install({ token: tampered }, USER_ID, SITE_ID)).rejects.toThrow(/ลายเซ็น/);
    expect(row).toBeNull();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('refuses an expired licence', async () => {
    const expired = offline({ iat: NOW - 172_800, exp: NOW - 86_400, inst: undefined });

    await expect(store.install({ token: expired }, USER_ID, SITE_ID)).rejects.toThrow(/หมดอายุ/);
    expect(row).toBeNull();
  });

  it('goes back to Community when the licence is removed', async () => {
    row = { id: 'default', token: offline(), updatedAt: new Date() };
    await store.onModuleInit();

    const view = await store.remove(USER_ID, SITE_ID);

    expect(view).toMatchObject({ edition: 'community', source: 'none' });
    expect(service.hasFeature('marketplace')).toBe(false);
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'license.remove', siteId: SITE_ID }),
    );
  });

  it('lets LUMIO_LICENSE win over the stored row', async () => {
    row = { id: 'default', token: offline({ features: [] }), updatedAt: new Date() };
    await store.onModuleInit();
    vi.stubEnv('LUMIO_LICENSE', offline({ plan: 'business', features: ['whitelabel'] }));

    expect(store.view()).toMatchObject({
      plan: 'business',
      features: ['whitelabel'],
      source: 'env',
      installedAt: null,
    });
  });
});

import { generateKeyPairSync, sign } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { ApiException } from '../../common/api-error';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import { MarketplaceService, verifyPackSignature } from './marketplace.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const USER_ID = '00000000-0000-4000-8000-000000000001';
const NOW = new Date('2026-10-30T00:00:00Z');

const manifest = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  v: 1,
  key: 'vendored',
  name: 'ชุดจากผู้พัฒนาภายนอก',
  description: 'ส่วนพร้อมใช้จากผู้พัฒนาภายนอก',
  version: '1.0.0',
  author: 'ร้านตัวอย่าง',
  sections: [
    {
      name: 'หน้าแรกจากผู้พัฒนา',
      blocks: [{ id: 'v-1', type: 'heading', version: 1, props: { text: 'สวัสดี' }, children: [] }],
    },
  ],
  ...overrides,
});

const pair = generateKeyPairSync('ed25519');
const publicKey = pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64');

const signedToken = (value: unknown = manifest()): string => {
  const segment = Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
  const signingInput = `lumio_pack_v1.${segment}`;
  const signature = sign(null, Buffer.from(signingInput, 'utf8'), pair.privateKey);
  return `${signingInput}.${signature.toString('base64url')}`;
};

const row = (overrides: Record<string, unknown> = {}) => ({
  siteId: SITE_ID,
  packKey: 'lumio-launch',
  version: '1.1.0',
  source: 'official',
  manifest: manifest({ key: 'lumio-launch', name: 'ชุดเปิดตัวเว็บ', version: '1.1.0' }),
  token: null,
  enabled: true,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

interface Stubs {
  db: PrismaService;
  create: Mock;
  update: Mock;
  remove: Mock;
  auditLogCreate: Mock;
}

const stubs = (options: { rows?: unknown[]; existing?: unknown } = {}): Stubs => {
  const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) =>
    row({ ...data, createdAt: NOW, updatedAt: NOW }),
  );
  const update = vi.fn(async ({ data }: { data: Record<string, unknown> }) =>
    row({ ...data, createdAt: NOW, updatedAt: NOW }),
  );
  const remove = vi.fn().mockResolvedValue({});
  const auditLogCreate = vi.fn().mockResolvedValue({});

  const db = {
    forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) =>
      fn({
        siteBlockPack: {
          findMany: vi.fn().mockResolvedValue(options.rows ?? []),
          findUnique: vi.fn().mockResolvedValue(options.existing ?? null),
          create,
          update,
          delete: remove,
        },
        auditLog: { create: auditLogCreate },
      }),
    ),
  } as unknown as PrismaService;

  return { db, create, update, remove, auditLogCreate };
};

const service = (all: Stubs): MarketplaceService =>
  new MarketplaceService(all.db, {
    log: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuditService);

beforeEach(() => {
  vi.stubEnv('MARKETPLACE_PUBLIC_KEY', publicKey);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('MarketplaceService view', () => {
  it('lists the official catalogue as not installed when the site has nothing', async () => {
    const result = await service(stubs()).view(SITE_ID);

    expect(result.catalog.length).toBeGreaterThan(0);
    expect(result.catalog.every((entry) => entry.installed === false)).toBe(true);
    expect(result.installed).toEqual([]);
  });

  it('flags an installed pack and a newer catalogue version', async () => {
    const installed = row({ version: '1.0.0' });
    const result = await service(stubs({ rows: [installed] })).view(SITE_ID);
    const launch = result.catalog.find((entry) => entry.key === 'lumio-launch');

    expect(launch?.installed).toBe(true);
    expect(launch?.installedVersion).toBe('1.0.0');
    expect(launch?.updateAvailable).toBe(true);
    expect(result.installed[0]).toMatchObject({ key: 'lumio-launch', sectionCount: 1 });
  });

  it('skips a row whose stored manifest no longer parses', async () => {
    const result = await service(
      stubs({ rows: [row({ manifest: { v: 1, key: 'broken' } })] }),
    ).view(SITE_ID);

    expect(result.installed).toEqual([]);
  });
});

describe('MarketplaceService sections', () => {
  it('returns sections of enabled packs in a stable id form', async () => {
    const installed = row({
      packKey: 'vendored',
      source: 'external',
      token: 'token',
      manifest: manifest(),
    });

    const sections = await service(stubs({ rows: [installed] })).sections(SITE_ID);

    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({
      id: 'marketplace:vendored:0',
      packKey: 'vendored',
      name: 'หน้าแรกจากผู้พัฒนา',
    });
    expect(sections[0]?.blocks).toHaveLength(1);
  });

  it('skips a stored pack whose manifest no longer parses', async () => {
    const result = await service(
      stubs({ rows: [row({ manifest: { v: 1, key: 'broken' } })] }),
    ).sections(SITE_ID);

    expect(result).toEqual([]);
  });
});

describe('MarketplaceService install', () => {
  it('installs an official pack and records it in the audit log', async () => {
    const all = stubs();

    const installed = await service(all).install(SITE_ID, { key: 'lumio-launch' }, USER_ID);

    expect(installed).toMatchObject({ key: 'lumio-launch', source: 'official', signed: false });
    expect(all.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ siteId: SITE_ID, packKey: 'lumio-launch' }),
      }),
    );
    expect(all.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'marketplace.pack.install',
          target: 'lumio-launch',
        }),
      }),
    );
  });

  it('upgrades an installed pack in place', async () => {
    const all = stubs({ existing: row({ version: '1.0.0' }) });

    await service(all).install(SITE_ID, { key: 'lumio-launch' }, USER_ID);

    expect(all.update).toHaveBeenCalled();
    expect(all.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'marketplace.pack.update' }),
      }),
    );
  });

  it('refuses to reinstall the same version', async () => {
    const all = stubs({ existing: row({ version: '1.1.0' }) });

    await expect(
      service(all).install(SITE_ID, { key: 'lumio-launch' }, USER_ID),
    ).rejects.toBeInstanceOf(ApiException);
  });

  it('refuses an unknown catalogue key', async () => {
    await expect(
      service(stubs()).install(SITE_ID, { key: 'not-a-pack' }, USER_ID),
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it('installs a correctly signed vendor pack and keeps its token', async () => {
    const all = stubs();
    const token = signedToken();

    const installed = await service(all).install(SITE_ID, { token }, USER_ID);

    expect(installed).toMatchObject({ key: 'vendored', source: 'external', signed: true });
    expect(all.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ token }) }),
    );
  });

  it('refuses a pack whose signature does not match its content', async () => {
    const all = stubs();
    const [prefix, , signature] = signedToken().split('.');
    const forgedPayload = Buffer.from(JSON.stringify(manifest({ version: '9.9.9' }))).toString(
      'base64url',
    );

    await expect(
      service(all).install(SITE_ID, { token: `${prefix}.${forgedPayload}.${signature}` }, USER_ID),
    ).rejects.toMatchObject({ code: 'validation_error' });
    expect(all.create).not.toHaveBeenCalled();
  });

  it('refuses a vendor pack that reuses an official key', async () => {
    await expect(
      service(stubs()).install(
        SITE_ID,
        { token: signedToken(manifest({ key: 'lumio-launch' })) },
        USER_ID,
      ),
    ).rejects.toMatchObject({ code: 'conflict' });
  });

  it('refuses a pack that needs a newer Lumio', async () => {
    vi.stubEnv('LUMIO_VERSION', '0.22.0');

    await expect(
      service(stubs()).install(
        SITE_ID,
        { token: signedToken(manifest({ minLumioVersion: '9.0.0' })) },
        USER_ID,
      ),
    ).rejects.toMatchObject({ code: 'conflict' });
  });

  it('refuses a signed pack when no key is configured', () => {
    expect(verifyPackSignature(signedToken(), '')).toEqual({ ok: false, reason: 'no_public_key' });
  });

  it('cannot install while the platform kill switch is on', async () => {
    vi.stubEnv('MARKETPLACE_PLATFORM_DISABLED', 'true');

    await expect(
      service(stubs()).install(SITE_ID, { key: 'lumio-launch' }, USER_ID),
    ).rejects.toMatchObject({ code: 'forbidden' });
  });
});

describe('MarketplaceService installed packs', () => {
  it('turns a pack off and audits the change', async () => {
    const all = stubs({ existing: row() });

    const updated = await service(all).setEnabled(SITE_ID, 'lumio-launch', false, USER_ID);

    expect(updated.enabled).toBe(false);
    expect(all.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'marketplace.pack.disable' }),
      }),
    );
  });

  it('turns a pack back on', async () => {
    const all = stubs({ existing: row({ enabled: false }) });

    const updated = await service(all).setEnabled(SITE_ID, 'lumio-launch', true, USER_ID);

    expect(updated.enabled).toBe(true);
    expect(all.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'marketplace.pack.enable' }),
      }),
    );
  });

  it('refuses to change a pack the site does not have', async () => {
    await expect(
      service(stubs()).setEnabled(SITE_ID, 'vendored', true, USER_ID),
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it('removes a pack and audits the removal', async () => {
    const all = stubs({ existing: row() });

    await service(all).remove(SITE_ID, 'lumio-launch', USER_ID);

    expect(all.remove).toHaveBeenCalled();
    expect(all.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'marketplace.pack.remove' }),
      }),
    );
  });

  it('cannot remove while the platform kill switch is on', async () => {
    vi.stubEnv('MARKETPLACE_PLATFORM_DISABLED', 'true');

    await expect(
      service(stubs({ existing: row() })).remove(SITE_ID, 'lumio-launch', USER_ID),
    ).rejects.toMatchObject({ code: 'forbidden' });
  });
});

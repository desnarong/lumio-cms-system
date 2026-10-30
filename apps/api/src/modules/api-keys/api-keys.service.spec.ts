import { describe, expect, it, vi, type Mock } from 'vitest';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import { ApiKeysService } from './api-keys.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const USER_ID = '00000000-0000-4000-8000-000000000001';
const KEY_ID = '00000000-0000-4000-8000-0000000000c1';

const row = (overrides: Record<string, unknown> = {}) => ({
  id: KEY_ID,
  siteId: SITE_ID,
  name: 'ปลั๊กอินร้านค้า',
  hint: 'lum_00000000',
  keyHash: 'a'.repeat(64),
  scopes: ['content:read'],
  lastUsedAt: null,
  revokedAt: null,
  createdBy: USER_ID,
  createdAt: new Date('2026-11-01T00:00:00Z'),
  updatedAt: new Date('2026-11-01T00:00:00Z'),
  ...overrides,
});

const auditStub = (): { log: Mock } => ({ log: vi.fn().mockResolvedValue(undefined) });

const dbWith = (tx: Record<string, unknown>): PrismaService =>
  ({
    forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx)),
  }) as unknown as PrismaService;

const service = (tx: Record<string, unknown>, audit = auditStub()) =>
  new ApiKeysService(dbWith(tx), audit as unknown as AuditService);

describe('ApiKeysService', () => {
  it('returns the plaintext secret once and never lists it again', async () => {
    const create = vi.fn().mockImplementation(async ({ data }) => row({ ...data, id: KEY_ID }));
    const keys = service({ apiKey: { create } });

    const created = await keys.create(SITE_ID, { name: 'ปลั๊กอินร้านค้า', scopes: ['content:read'] }, USER_ID);

    expect(created.secret.startsWith('lum_')).toBe(true);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ siteId: SITE_ID }) }),
    );
  });

  it('records an audit entry when a key is revoked', async () => {
    const audit = auditStub();
    const update = vi.fn().mockResolvedValue(row({ revokedAt: new Date() }));
    const keys = service({ apiKey: { findUnique: vi.fn().mockResolvedValue(row()), update } }, audit);

    const revoked = await keys.revoke(SITE_ID, KEY_ID, USER_ID);

    expect(revoked.revokedAt).not.toBeNull();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'api_key.revoke', target: KEY_ID }),
    );
  });

  it('refuses a key that was revoked', async () => {
    const keys = service({
      apiKey: {
        findUnique: vi.fn().mockResolvedValue(row({ revokedAt: new Date() })),
        update: vi.fn(),
      },
    });
    // A well-formed key naming this site, so only the database lookup decides.
    const secret = `lum_${SITE_ID.replace(/-/g, '')}.${'A'.repeat(32)}`;

    await expect(keys.authenticate(secret)).rejects.toMatchObject({ code: 'unauthorized' });
  });

  it('answers the same 401 for a malformed key', async () => {
    const keys = service({ apiKey: { findUnique: vi.fn() } });

    await expect(keys.authenticate('not-a-key')).rejects.toMatchObject({ code: 'unauthorized' });
  });

  it('lists only published, public documents', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const keys = service({ content: { findMany, count } });

    await keys.listDocuments(
      { siteId: SITE_ID, keyId: KEY_ID, scopes: ['content:read'] },
      'page',
      { limit: 10 },
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: 'page', status: 'published', access: 'public' }),
      }),
    );
  });

  it('refuses a key without the read scope', async () => {
    const keys = service({ content: { findMany: vi.fn(), count: vi.fn() } });

    await expect(
      keys.listDocuments({ siteId: SITE_ID, keyId: KEY_ID, scopes: [] }, 'page', {}),
    ).rejects.toMatchObject({ code: 'forbidden' });
  });
});

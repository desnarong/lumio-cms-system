import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
  communityStatus,
  siteFeatureFlagsFromSettings,
  type LicenseFeature,
  type LicenseStatus,
} from '@lumio/shared';
import type { AuditService } from '../audit/audit.service';
import type { LicenseService } from '../license/license.service';
import type { PrismaService } from '../prisma/prisma.service';
import { FeaturesService } from './features.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000c1';
const USER_ID = '00000000-0000-4000-8000-000000000002';

interface Stubs {
  db: PrismaService;
  auditLog: Mock;
  settings: () => Record<string, unknown>;
}

const stubs = (initial: Record<string, unknown> = {}): Stubs => {
  let settings = initial;
  const auditLog = vi.fn().mockResolvedValue(undefined);

  const tx = {
    site: {
      findUnique: async () => ({ settings }),
      update: async ({ data }: { data: { settings: Record<string, unknown> } }) => {
        settings = data.settings;
        return { settings };
      },
    },
  };

  const db = {
    forSite: async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx),
  } as unknown as PrismaService;

  return { db, auditLog, settings: () => settings };
};

const service = (all: Stubs, license: LicenseStatus = communityStatus('missing')): FeaturesService =>
  new FeaturesService(
    all.db,
    { log: all.auditLog } as unknown as AuditService,
    {
      status: () => license,
      hasFeature: (feature: LicenseFeature) => license.valid && license.features.includes(feature),
    } as unknown as LicenseService,
  );

describe('FeaturesService', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('starts every free capability on, so an existing site loses no screen', async () => {
    const list = await service(stubs()).list(SITE_ID);

    expect(list.items).toHaveLength(7);
    expect(
      list.items.filter((item) => !item.lockedByLicense).map((item) => item.enabled),
    ).toEqual([true, true, true, true, true]);
    expect(list.items.every((item) => !item.lockedByPlatform)).toBe(true);
  });

  it('keeps paid capabilities locked until a licence lists them', async () => {
    const community = await service(stubs()).list(SITE_ID);
    expect(community.items.filter((item) => item.lockedByLicense).map((item) => item.key)).toEqual([
      'membership',
      'marketplace',
    ]);

    const licensed = await service(stubs(), {
      ...communityStatus('ok'),
      edition: 'pro',
      valid: true,
      plan: 'pro',
      features: ['membership'],
    }).list(SITE_ID);
    expect(licensed.items.find((item) => item.key === 'membership')).toMatchObject({
      enabled: false,
      lockedByLicense: false,
    });
    expect(licensed.items.find((item) => item.key === 'marketplace')?.lockedByLicense).toBe(true);
  });

  it('keeps what the site chose and writes an audit entry', async () => {
    const all = stubs({ commerce: { enabled: true } });
    const list = await service(all).update(SITE_ID, { flags: { commerce: false } }, USER_ID);

    expect(list.items.find((item) => item.key === 'commerce')?.enabled).toBe(false);
    expect(siteFeatureFlagsFromSettings(all.settings())).toEqual({ commerce: false });
    expect(all.settings().commerce).toEqual({ enabled: true });
    expect(all.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: SITE_ID,
        userId: USER_ID,
        action: 'site.features.update',
      }),
    );
  });

  it('lets the platform close a capability for every site', async () => {
    vi.stubEnv('LUMIO_DISABLED_FEATURES', 'ai, commerce');
    const list = await service(stubs()).list(SITE_ID);

    const ai = list.items.find((item) => item.key === 'ai');
    expect(ai).toMatchObject({ key: 'ai', enabled: false, lockedByPlatform: true });
    expect(list.items.find((item) => item.key === 'newsletter')?.lockedByPlatform).toBe(false);
  });

  it('refuses to switch on a paid capability without a licence', async () => {
    await expect(
      service(stubs()).update(SITE_ID, { flags: { membership: true } }, USER_ID),
    ).rejects.toMatchObject({ code: 'conflict' });
  });

  it('lets a licensed deployment switch its paid capability on', async () => {
    const list = await service(
      stubs(),
      { ...communityStatus('ok'), edition: 'pro', valid: true, plan: 'pro', features: ['membership'] },
    ).update(SITE_ID, { flags: { membership: true } }, USER_ID);

    expect(list.items.find((item) => item.key === 'membership')?.enabled).toBe(true);
  });

  it('refuses to switch a platform-closed capability back on', async () => {
    vi.stubEnv('LUMIO_DISABLED_FEATURES', 'commerce');

    await expect(
      service(stubs()).update(SITE_ID, { flags: { commerce: true } }, USER_ID),
    ).rejects.toMatchObject({ code: 'conflict' });
  });

  it('lets a site switch a kill-switched capability off without an error', async () => {
    vi.stubEnv('LUMIO_DISABLED_FEATURES', 'commerce');
    const list = await service(stubs()).update(SITE_ID, { flags: { commerce: false } }, USER_ID);

    expect(list.items.find((item) => item.key === 'commerce')).toMatchObject({
      key: 'commerce',
      enabled: false,
      lockedByPlatform: true,
    });
  });

  it('answers the resolved state for one capability', async () => {
    const all = stubs({ flags: { analytics: false } });

    await expect(service(all).isEnabled(SITE_ID, 'analytics')).resolves.toBe(false);
    await expect(service(all).isEnabled(SITE_ID, 'ai')).resolves.toBe(true);
  });
});

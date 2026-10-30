import { describe, expect, it, vi } from 'vitest';
import type { AuditService } from '../audit/audit.service';
import type { LicenseService } from '../license/license.service';
import type { PrismaService } from '../prisma/prisma.service';
import { AgencyService } from './agency.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const USER_ID = '00000000-0000-4000-8000-000000000001';

const audit = () => ({ log: vi.fn().mockResolvedValue(undefined) }) as unknown as AuditService;
const license = (allowed: boolean) =>
  ({ hasFeature: vi.fn().mockReturnValue(allowed) }) as unknown as LicenseService;

const dbWith = (row: Record<string, unknown> | null): PrismaService =>
  ({
    agencyBranding: {
      findUnique: vi.fn().mockResolvedValue(row),
      upsert: vi.fn().mockImplementation(async ({ create }) => create),
    },
  }) as unknown as PrismaService;

describe('AgencyService', () => {
  it('falls back to the Lumio brand when nothing is stored', async () => {
    const service = new AgencyService(dbWith(null), audit(), license(false));

    await expect(service.get()).resolves.toMatchObject({
      brandName: 'Lumio',
      licensed: false,
      hideBranding: false,
    });
  });

  it('reports whether white-labelling is licensed', async () => {
    const service = new AgencyService(dbWith(null), audit(), license(true));

    expect(service.licensed()).toBe(true);
    await expect(service.get()).resolves.toMatchObject({ licensed: true });
  });

  it('refuses a change on a Community licence', async () => {
    const service = new AgencyService(dbWith(null), audit(), license(false));

    await expect(
      service.update({ brandName: 'เอเจนซี' }, USER_ID, SITE_ID),
    ).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('merges a partial change over the stored branding', async () => {
    const service = new AgencyService(
      dbWith({ brandName: 'เดิม', logoUrl: null, supportEmail: null, hideBranding: true, accentColor: null }),
      audit(),
      license(true),
    );

    const updated = await service.update({ brandName: 'เอเจนซีใหม่' }, USER_ID, SITE_ID);

    expect(updated).toMatchObject({ brandName: 'เอเจนซีใหม่', hideBranding: true, licensed: true });
  });
});

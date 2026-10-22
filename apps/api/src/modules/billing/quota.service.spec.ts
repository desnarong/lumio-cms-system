import { describe, expect, it, vi } from 'vitest';
import { ApiException } from '../../common/api-error';
import type { PrismaService } from '../prisma/prisma.service';
import { QuotaService } from './quota.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';

const dbWith = (tx: Record<string, unknown>): PrismaService =>
  ({
    forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx)),
  }) as unknown as PrismaService;

const site = (plan: string) => ({ site: { findUnique: vi.fn().mockResolvedValue({ plan }) } });

describe('QuotaService pages', () => {
  it('allows a page while the plan still has room', async () => {
    const service = new QuotaService(
      dbWith({ ...site('free'), content: { count: vi.fn().mockResolvedValue(2) } }),
    );

    await expect(service.assertCanAddPage(SITE_ID)).resolves.toBeUndefined();
  });

  it('refuses the page that would go past the plan and explains what to do', async () => {
    const service = new QuotaService(
      dbWith({ ...site('free'), content: { count: vi.fn().mockResolvedValue(3) } }),
    );

    await expect(service.assertCanAddPage(SITE_ID)).rejects.toThrow(/แพ็กเกจนี้มีได้ 3 หน้า/);
  });

  it('never blocks an unlimited plan', async () => {
    const service = new QuotaService(
      dbWith({ ...site('pro'), content: { count: vi.fn().mockResolvedValue(9_999) } }),
    );

    await expect(service.assertCanAddPage(SITE_ID)).resolves.toBeUndefined();
  });

  it('hides a site that no longer exists', async () => {
    const service = new QuotaService(
      dbWith({ site: { findUnique: vi.fn().mockResolvedValue(null) } }),
    );

    await expect(service.assertCanAddPage(SITE_ID)).rejects.toBeInstanceOf(ApiException);
  });
});

describe('QuotaService media', () => {
  const usedBytes = (bytes: bigint) => ({
    ...site('starter'),
    media: { aggregate: vi.fn().mockResolvedValue({ _sum: { sizeBytes: bytes } }) },
  });

  it('allows a file that still fits in the storage quota', async () => {
    const service = new QuotaService(dbWith(usedBytes(1024n)));

    await expect(service.assertCanAddMediaBytes(SITE_ID, 1024)).resolves.toBeUndefined();
  });

  it('refuses a file that would fill the plan and says how much room it had', async () => {
    const limit = 2 * 1024 * 1024 * 1024;
    const service = new QuotaService(dbWith(usedBytes(BigInt(limit - 100))));

    await expect(service.assertCanAddMediaBytes(SITE_ID, 200)).rejects.toThrow(/2 GB/);
  });
});

describe('QuotaService team', () => {
  it('refuses an invitation once the team is full', async () => {
    const service = new QuotaService(
      dbWith({ ...site('starter'), siteMember: { count: vi.fn().mockResolvedValue(2) } }),
    );

    await expect(service.assertCanAddMember(SITE_ID)).rejects.toThrow(/ทีมได้ 2 คน/);
  });

  it('allows an invitation when there is room', async () => {
    const service = new QuotaService(
      dbWith({ ...site('pro'), siteMember: { count: vi.fn().mockResolvedValue(4) } }),
    );

    await expect(service.assertCanAddMember(SITE_ID)).resolves.toBeUndefined();
  });
});

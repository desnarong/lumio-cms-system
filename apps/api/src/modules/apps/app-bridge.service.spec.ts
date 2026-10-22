import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { AppBridgeService } from './app-bridge.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';

const externalManifest = {
  key: 'booking-widget',
  name: 'Booking',
  description: 'Takes bookings',
  version: '1.0.0',
  permissions: ['analytics:read'],
  category: 'content',
  entry: 'https://apps.example.com/admin/index.html',
};

const dbWith = (row: Record<string, unknown> | null): PrismaService => {
  const tx = {
    siteApp: { findUnique: vi.fn().mockResolvedValue(row) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    $queryRaw: vi.fn().mockResolvedValue([{ visitors: 3n, pageviews: 9n }]),
  };
  return {
    forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx)),
  } as unknown as PrismaService;
};

const request = (method: string) => ({ id: 'r1', method });

describe('AppBridgeService', () => {
  it('uses the stored manifest scopes for an external App', async () => {
    const db = dbWith({ enabled: true, source: 'external', manifest: externalManifest });

    const response = await new AppBridgeService(db).call(
      SITE_ID,
      'booking-widget',
      request('analytics.summary'),
      null,
    );

    expect(response.ok).toBe(true);
    expect(response.result).toEqual({ visitors: 3, pageviews: 9 });
  });

  it('refuses a scope the manifest never asked for', async () => {
    const db = dbWith({ enabled: true, source: 'external', manifest: externalManifest });

    await expect(
      new AppBridgeService(db).call(SITE_ID, 'booking-widget', request('forms.list'), null),
    ).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('stops every App when the platform kill switch is on', async () => {
    process.env.APPS_PLATFORM_DISABLED = 'true';
    try {
      const db = dbWith({ enabled: true, source: 'external', manifest: externalManifest });
      await expect(
        new AppBridgeService(db).call(SITE_ID, 'booking-widget', request('analytics.summary'), null),
      ).rejects.toMatchObject({ code: 'forbidden' });
    } finally {
      delete process.env.APPS_PLATFORM_DISABLED;
    }
  });

  it('stops external Apps when external manifests are switched off', async () => {
    process.env.APPS_EXTERNAL_ENABLED = 'false';
    try {
      const db = dbWith({ enabled: true, source: 'external', manifest: externalManifest });
      await expect(
        new AppBridgeService(db).call(SITE_ID, 'booking-widget', request('analytics.summary'), null),
      ).rejects.toMatchObject({ code: 'forbidden' });
    } finally {
      delete process.env.APPS_EXTERNAL_ENABLED;
    }
  });
});

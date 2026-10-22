import { describe, expect, it, vi, type Mock } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { PublicTrackingService, trackingSessionHash } from './public-tracking.service';

const SITE = { id: '00000000-0000-4000-8000-0000000000a1', subdomain: 'baandoi' };

interface Stubs {
  db: PrismaService;
  executeRaw: Mock;
  forSite: Mock;
}

const stubs = (): Stubs => {
  const executeRaw = vi.fn().mockResolvedValue(1);
  const forSite = vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) =>
    fn({ $executeRaw: executeRaw }),
  );
  const db = {
    domain: { findUnique: vi.fn().mockResolvedValue({ site: SITE }) },
    site: { findUnique: vi.fn().mockResolvedValue(null) },
    forSite,
  } as unknown as PrismaService;
  return { db, executeRaw, forSite };
};

describe('PublicTrackingService', () => {
  it('records one page view inside the site-scoped transaction', async () => {
    const { db, executeRaw, forSite } = stubs();

    await new PublicTrackingService(db).record(
      'baandoi.lumio.app',
      { path: 'https://baandoi.lumio.app/services?utm=1', referrer: 'https://google.com' },
      { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', ip: '203.0.113.9' },
    );

    expect(forSite).toHaveBeenCalledWith(SITE.id, expect.any(Function));
    expect(executeRaw).toHaveBeenCalledTimes(1);
    const values = executeRaw.mock.calls[0]!.slice(1);
    expect(values).toContain('/services');
    expect(values).toContain('https://google.com');
    expect(values).toContain('mobile');
    // The stored hash is derived, never the raw IP or user agent.
    expect(values.some((value) => value === '203.0.113.9')).toBe(false);
  });

  it('counts a visit once per visitor id, not per request', async () => {
    const { db, executeRaw } = stubs();
    const service = new PublicTrackingService(db);

    await service.record('baandoi.lumio.app', { path: '/', visitorId: 'v-1' }, { ip: 'a' });
    await service.record('baandoi.lumio.app', { path: '/about', visitorId: 'v-1' }, { ip: 'b' });

    const first = executeRaw.mock.calls[0]!.slice(1).at(-1);
    const second = executeRaw.mock.calls[1]!.slice(1).at(-1);
    expect(first).toBe(second);
  });

  it('falls back to the home page for an empty path', async () => {
    const { db, executeRaw } = stubs();
    await new PublicTrackingService(db).record('baandoi.lumio.app', { path: '   ' }, {});
    expect(executeRaw.mock.calls[0]!.slice(1)).toContain('/');
  });
});

describe('trackingSessionHash', () => {
  it('is stable for the same seed and day, and rotates by day', () => {
    const a = trackingSessionHash(SITE.id, 'v1', {}, '2026-10-21', 'salt');
    const b = trackingSessionHash(SITE.id, 'v1', {}, '2026-10-21', 'salt');
    const c = trackingSessionHash(SITE.id, 'v1', {}, '2026-10-22', 'salt');

    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toHaveLength(32);
  });
});

describe('PublicTrackingService edge batches', () => {
  it('looks up the site once and inserts every event in one scoped transaction', async () => {
    const { db, executeRaw, forSite } = stubs();

    const accepted = await new PublicTrackingService(db).recordMany(
      'baandoi.lumio.app',
      [
        { path: '/', visitorId: 'v-1', userAgent: 'Mozilla/5.0 (iPhone)', country: 'TH' },
        { path: '/services', visitorId: 'v-2', userAgent: 'Mozilla/5.0 (Windows NT 10.0)', country: 'US' },
      ],
      { ip: '203.0.113.9' },
    );

    expect(accepted).toBe(2);
    expect(forSite).toHaveBeenCalledTimes(1);
    expect(executeRaw).toHaveBeenCalledTimes(2);
    expect(executeRaw.mock.calls[0]!.slice(1)).toContain('mobile');
    expect(executeRaw.mock.calls[0]!.slice(1)).toContain('TH');
    expect(executeRaw.mock.calls[1]!.slice(1)).toContain('desktop');
    expect(executeRaw.mock.calls[1]!.slice(1)).toContain('US');
  });

  it('does nothing for an empty batch', async () => {
    const { db, forSite } = stubs();
    await expect(
      new PublicTrackingService(db).recordMany('baandoi.lumio.app', []),
    ).resolves.toBe(0);
    expect(forSite).not.toHaveBeenCalled();
  });
});

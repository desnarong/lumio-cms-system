import { describe, expect, it, vi, type Mock } from 'vitest';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import { PromotionsService } from './promotions.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const PROMO_ID = '00000000-0000-4000-8000-0000000000b1';
const USER_ID = '00000000-0000-4000-8000-000000000001';

const row = (overrides: Record<string, unknown> = {}) => ({
  id: PROMO_ID,
  siteId: SITE_ID,
  title: 'ซื้อ 10 แถม 1',
  description: 'สำหรับหลอด LED',
  kind: 'bundle',
  badge: '',
  imageUrl: null,
  imageAlt: '',
  buyQty: 10,
  getQty: 1,
  startsAt: null,
  endsAt: null,
  active: true,
  sort: 0,
  createdAt: new Date('2026-10-01T00:00:00Z'),
  updatedAt: new Date('2026-10-01T00:00:00Z'),
  ...overrides,
});

const auditStub = (): { log: Mock } => ({ log: vi.fn().mockResolvedValue(undefined) });

const dbWith = (tx: Record<string, unknown>): PrismaService =>
  ({
    forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx)),
  }) as unknown as PrismaService;

const publishStub = () => ({ enqueueChrome: vi.fn().mockResolvedValue({}) });

const service = (tx: Record<string, unknown>, audit = auditStub()) =>
  new PromotionsService(
    dbWith(tx),
    audit as unknown as AuditService,
    publishStub() as never,
  );

const input = {
  title: 'ซื้อ 10 แถม 1',
  description: 'สำหรับหลอด LED',
  kind: 'bundle' as const,
  badge: '',
  imageUrl: null,
  imageAlt: '',
  buyQty: 10,
  getQty: 1,
  startsAt: null,
  endsAt: null,
  active: true,
  sort: 0,
};

describe('PromotionsService', () => {
  it('lists offers in display order', async () => {
    const findMany = vi.fn().mockResolvedValue([row()]);
    const promotions = service({ promotion: { findMany } });

    const items = await promotions.list(SITE_ID);

    expect(items[0]).toMatchObject({ id: PROMO_ID, title: 'ซื้อ 10 แถม 1', buyQty: 10 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }] }),
    );
  });

  it('records an audit entry when an offer is created', async () => {
    const audit = auditStub();
    const create = vi.fn().mockResolvedValue(row());
    const promotions = service({ promotion: { create } }, audit);

    await promotions.create(SITE_ID, input, USER_ID);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ siteId: SITE_ID, buyQty: 10 }) }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'promotion.create', target: PROMO_ID }),
    );
  });

  it('refuses to update an offer that does not exist', async () => {
    const promotions = service({ promotion: { findUnique: vi.fn().mockResolvedValue(null) } });

    await expect(
      promotions.update(SITE_ID, PROMO_ID, { title: 'ใหม่' }, USER_ID),
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it('shows only active offers that are inside their dates', async () => {
    const expired = new Date(Date.now() - 86_400_000).toISOString();
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const findMany = vi.fn().mockResolvedValue([
      row({ id: 'live' }),
      row({ id: 'off', active: false }),
      row({ id: 'expired', endsAt: new Date(expired) }),
      row({ id: 'future', startsAt: new Date(future) }),
    ]);
    const promotions = service({ promotion: { findMany } });

    const items = await promotions.listLive(SITE_ID);

    expect(items.map((item) => item.id)).toEqual(['live']);
  });
});

import { describe, expect, it, vi, type Mock } from 'vitest';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import { NewsletterService } from './newsletter.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const USER_ID = '00000000-0000-4000-8000-000000000001';

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'sub-1',
  siteId: SITE_ID,
  email: 'somchai@example.com',
  status: 'active',
  createdAt: new Date('2026-10-20T09:00:00Z'),
  updatedAt: new Date('2026-10-20T09:00:00Z'),
  ...overrides,
});

interface Stubs {
  db: PrismaService;
  auditLogCreate: Mock;
  subscriberCreate: Mock;
  subscriberUpdate: Mock;
  subscriberDelete: Mock;
}

const stubs = (
  options: {
    rows?: unknown[];
    total?: number;
    activeCount?: number;
    existing?: unknown;
    subscriber?: unknown;
  } = {},
): Stubs => {
  const auditLogCreate = vi.fn().mockResolvedValue({});
  const subscriberCreate = vi.fn().mockResolvedValue(row());
  const subscriberUpdate = vi.fn().mockResolvedValue(row({ status: 'unsubscribed' }));
  const subscriberDelete = vi.fn().mockResolvedValue({});

  const tx = {
    subscriber: {
      findMany: vi.fn().mockResolvedValue(options.rows ?? []),
      count: vi
        .fn()
        .mockResolvedValueOnce(options.total ?? 0)
        .mockResolvedValueOnce(options.activeCount ?? 0),
      findFirst: vi.fn().mockResolvedValue(options.existing ?? null),
      findUnique: vi.fn().mockResolvedValue('subscriber' in options ? options.subscriber : row()),
      create: subscriberCreate,
      update: subscriberUpdate,
      delete: subscriberDelete,
    },
    auditLog: { create: auditLogCreate },
  };

  const db = {
    forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx)),
  } as unknown as PrismaService;

  return { db, auditLogCreate, subscriberCreate, subscriberUpdate, subscriberDelete };
};

const service = (all: Stubs): NewsletterService =>
  new NewsletterService(all.db, { log: vi.fn() } as unknown as AuditService);

describe('NewsletterService', () => {
  it('lists subscribers with totals and a cursor', async () => {
    const all = stubs({ rows: [row(), row({ id: 'sub-2' })], total: 5, activeCount: 4 });
    const page = await service(all).list(SITE_ID, { limit: 1 });

    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(5);
    expect(page.activeCount).toBe(4);
    expect(page.cursor).toBe('sub-1');
  });

  it('adds a subscriber and records an audit entry', async () => {
    const all = stubs();
    const created = await service(all).create(SITE_ID, { email: 'somchai@example.com' }, USER_ID);

    expect(created.email).toBe('somchai@example.com');
    expect(all.subscriberCreate).toHaveBeenCalledOnce();
    expect(all.auditLogCreate).toHaveBeenCalledOnce();
  });

  it('refuses an email that is already on the list', async () => {
    const all = stubs({ existing: { id: 'sub-1' } });
    await expect(
      service(all).create(SITE_ID, { email: 'somchai@example.com' }, USER_ID),
    ).rejects.toMatchObject({ code: 'conflict' });
    expect(all.subscriberCreate).not.toHaveBeenCalled();
  });

  it('changes a status and refuses an unknown subscriber', async () => {
    const all = stubs();
    const updated = await service(all).update(
      SITE_ID,
      'sub-1',
      { status: 'unsubscribed' },
      USER_ID,
    );
    expect(updated.status).toBe('unsubscribed');
    expect(all.auditLogCreate).toHaveBeenCalledOnce();

    const missing = stubs({ subscriber: null });
    await expect(
      service(missing).update(SITE_ID, 'sub-x', { status: 'active' }, USER_ID),
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it('removes a subscriber and records who did it', async () => {
    const all = stubs();
    await service(all).remove(SITE_ID, 'sub-1', USER_ID);

    expect(all.subscriberDelete).toHaveBeenCalledWith({ where: { id: 'sub-1' } });
    expect(all.auditLogCreate).toHaveBeenCalledOnce();
  });

  it('exports the list as CSV', async () => {
    const all = stubs({ rows: [row()] });
    const csv = await service(all).exportCsv(SITE_ID);

    expect(csv).toContain('email,สถานะ,วันที่สมัคร');
    expect(csv).toContain('somchai@example.com');
  });
});

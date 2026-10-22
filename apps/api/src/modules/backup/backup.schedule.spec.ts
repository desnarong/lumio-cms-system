import { describe, expect, it, vi, type Mock } from 'vitest';
import type { MediaService } from '../media/media.service';
import type { MediaStorage } from '../media/media.storage';
import type { PrismaService } from '../prisma/prisma.service';
import { BackupScheduler } from './backup.scheduler';
import { BackupService } from './backup.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';

const storage = (): MediaStorage => ({ read: vi.fn() }) as unknown as MediaStorage;
const media = (): MediaService => ({ importFile: vi.fn() }) as unknown as MediaService;

interface DbStubs {
  db: PrismaService;
  create: Mock;
  update: Mock;
  deleteMany: Mock;
  log: Mock;
}

const dbStubs = (options: { settings?: Record<string, unknown>; rows?: unknown[] } = {}): DbStubs => {
  const create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
    id: 'backup-1',
    siteId: SITE_ID,
    filename: String(data.filename),
    sizeBytes: Number(data.sizeBytes),
    payload: data.payload,
    kind: String(data.kind),
    createdBy: null,
    createdAt: new Date('2026-10-22T04:00:00Z'),
  }));
  const update = vi.fn().mockResolvedValue({});
  const deleteMany = vi.fn().mockResolvedValue({ count: 2 });
  const log = vi.fn().mockResolvedValue(undefined);

  const tx = {
    site: {
      findUnique: async () => ({ settings: options.settings ?? {} }),
      update,
    },
    siteBackup: {
      create,
      findMany: async () => options.rows ?? [],
      findFirst: async () => options.rows?.[0] ?? null,
      deleteMany,
    },
  };

  const db = {
    forSite: async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx),
  } as unknown as PrismaService;

  return { db, create, update, deleteMany, log };
};

const service = (all: DbStubs): BackupService =>
  new BackupService(all.db, storage(), media(), { log: all.log } as never);

describe('BackupService schedules', () => {
  it('reads the saved schedule and the newest snapshot', async () => {
    const all = dbStubs({
      settings: { backup: { enabled: true, hour: 2, retentionDays: 7 } },
      rows: [
        {
          id: 'b1',
          filename: 'site-backup.json',
          sizeBytes: 1234,
          kind: 'auto',
          createdAt: new Date('2026-10-22T02:00:00Z'),
        },
      ],
    });

    const overview = await service(all).overview(SITE_ID);

    expect(overview.schedule).toEqual({
      enabled: true,
      hour: 2,
      retentionDays: 7,
      lastRunAt: '2026-10-22T02:00:00.000Z',
    });
    expect(overview.items[0]).toMatchObject({ id: 'b1', kind: 'auto', sizeBytes: 1234 });
  });

  it('saves the schedule next to the other site settings and audits it', async () => {
    const all = dbStubs({ settings: { commerce: { promptPayId: '0812345678' } } });

    await service(all).updateSchedule(
      SITE_ID,
      { enabled: true, hour: 4, retentionDays: 21 },
      'user-1',
    );

    expect(all.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          settings: {
            commerce: { promptPayId: '0812345678' },
            backup: { enabled: true, hour: 4, retentionDays: 21 },
          },
        },
      }),
    );
    expect(all.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'backup.schedule.update' }),
    );
  });

  it('stores a snapshot without media bytes so the row stays small', async () => {
    const all = dbStubs();
    const backup = service(all);
    const exportSite = vi
      .spyOn(backup, 'exportSite')
      .mockResolvedValue({ filename: 'baandoi-backup.json', content: '{"site":{"name":"ร้าน"}}' });

    const snapshot = await backup.snapshot(SITE_ID, 'manual', 'user-1');

    expect(exportSite).toHaveBeenCalledWith(SITE_ID, { mediaFiles: false });
    expect(all.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          siteId: SITE_ID,
          kind: 'manual',
          filename: 'baandoi-backup.json',
          payload: { site: { name: 'ร้าน' } },
        }),
      }),
    );
    expect(snapshot).toMatchObject({ id: 'backup-1', kind: 'manual' });
    expect(all.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'backup.snapshot.create' }),
    );
  });

  it('returns a stored snapshot as a download and rejects another site', async () => {
    const all = dbStubs({
      rows: [
        {
          id: 'b1',
          filename: 'baandoi-backup.json',
          payload: { site: { name: 'ร้าน' } },
          kind: 'auto',
          sizeBytes: 10,
          createdAt: new Date(),
        },
      ],
    });

    const file = await service(all).snapshotFile(SITE_ID, 'b1');
    expect(file.filename).toBe('baandoi-backup.json');
    expect(JSON.parse(file.content)).toEqual({ site: { name: 'ร้าน' } });
  });

  it('deletes snapshots past the retention window', async () => {
    const all = dbStubs();
    const removed = await service(all).purgeOld(SITE_ID, 14);

    expect(removed).toBe(2);
    expect(all.deleteMany).toHaveBeenCalledWith({
      where: { siteId: SITE_ID, createdAt: { lt: expect.any(Date) } },
    });
  });
});

describe('BackupScheduler', () => {
  const scheduler = (
    sites: { id: string; settings: Record<string, unknown> }[],
    lastRunAt: Date | null,
  ) => {
    const snapshot = vi.fn().mockResolvedValue({ id: 'b1' });
    const purgeOld = vi.fn().mockResolvedValue(0);
    const db = {
      site: { findMany: async () => sites },
      forSite: async (_id: string, fn: (client: unknown) => unknown) =>
        fn({
          siteBackup: { findFirst: async () => (lastRunAt ? { createdAt: lastRunAt } : null) },
        }),
    } as unknown as PrismaService;

    return {
      scheduler: new BackupScheduler(db, { snapshot, purgeOld } as unknown as BackupService),
      snapshot,
      purgeOld,
    };
  };

  it('takes the daily snapshot after the chosen hour when none ran today', async () => {
    const { scheduler: worker, snapshot, purgeOld } = scheduler(
      [{ id: SITE_ID, settings: { backup: { enabled: true, hour: 3, retentionDays: 7 } } }],
      new Date('2026-10-21T03:10:00'),
    );

    const count = await worker.runDue(new Date('2026-10-22T03:30:00'));

    expect(count).toBe(1);
    expect(snapshot).toHaveBeenCalledWith(SITE_ID, 'auto', null);
    expect(purgeOld).toHaveBeenCalledWith(SITE_ID, 7);
  });

  it('skips a site that was already backed up today and one with no schedule', async () => {
    const today = new Date('2026-10-22T03:10:00');
    const { scheduler: worker, snapshot } = scheduler(
      [
        { id: 'site-a', settings: { backup: { enabled: true, hour: 3, retentionDays: 7 } } },
        { id: 'site-b', settings: {} },
      ],
      today,
    );

    expect(await worker.runDue(new Date('2026-10-22T05:00:00'))).toBe(0);
    expect(snapshot).not.toHaveBeenCalled();
  });

  it('waits until the chosen hour', async () => {
    const { scheduler: worker, snapshot } = scheduler(
      [{ id: SITE_ID, settings: { backup: { enabled: true, hour: 22, retentionDays: 7 } } }],
      null,
    );

    expect(await worker.runDue(new Date('2026-10-22T03:00:00'))).toBe(0);
    expect(snapshot).not.toHaveBeenCalled();
  });
});

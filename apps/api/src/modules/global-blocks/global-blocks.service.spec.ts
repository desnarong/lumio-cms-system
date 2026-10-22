import { describe, expect, it, vi, type Mock } from 'vitest';
import { defaultBlockStyle } from '@lumio/shared';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import { GlobalBlocksService } from './global-blocks.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const USER_ID = '00000000-0000-4000-8000-000000000001';

const blockStyle = { ...defaultBlockStyle, visibility: { ...defaultBlockStyle.visibility } };

const headerBlocks = [
  {
    id: 'hdr_1',
    type: 'heading',
    version: 1,
    props: { text: 'กาแฟบ้านดอย', level: 'h2', align: 'left' },
    style: blockStyle,
    children: [],
  },
];

interface Stubs {
  db: PrismaService;
  create: Mock;
  update: Mock;
  auditLogCreate: Mock;
}

const stubs = (rows: unknown[] = [], existing: { id: string } | null = null): Stubs => {
  const create = vi.fn().mockResolvedValue({});
  const update = vi.fn().mockResolvedValue({});
  const auditLogCreate = vi.fn().mockResolvedValue({});

  const tx = {
    globalBlock: {
      findMany: vi.fn().mockResolvedValue(rows),
      findFirst: vi.fn().mockResolvedValue(existing),
      create,
      update,
    },
    auditLog: { create: auditLogCreate },
  };

  const db = {
    forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx)),
  } as unknown as PrismaService;

  return { db, create, update, auditLogCreate };
};

const service = (all: Stubs): GlobalBlocksService =>
  new GlobalBlocksService(all.db, {
    log: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuditService);

describe('GlobalBlocksService', () => {
  it('reads header and footer, keeping unreadable blocks out', async () => {
    const all = stubs([
      { kind: 'header', blocks: headerBlocks },
      { kind: 'footer', blocks: 'ไม่ใช่ tree' },
    ]);

    const blocks = await service(all).get(SITE_ID);

    expect(blocks.header).toHaveLength(1);
    expect(blocks.footer).toEqual([]);
  });

  it('creates the row the first time a header is saved', async () => {
    const all = stubs([], null);

    await service(all).update(SITE_ID, 'header', { blocks: headerBlocks }, USER_ID);

    expect(all.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ siteId: SITE_ID, kind: 'header' }),
      }),
    );
    expect(all.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'global_block.update', target: 'header' }),
      }),
    );
  });

  it('updates the existing row instead of adding a second one', async () => {
    const all = stubs([{ kind: 'footer', blocks: [] }], { id: 'gb-1' });

    await service(all).update(SITE_ID, 'footer', { blocks: headerBlocks }, USER_ID);

    expect(all.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'gb-1' } }),
    );
    expect(all.create).not.toHaveBeenCalled();
  });
});

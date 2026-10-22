import { describe, expect, it, vi, type Mock } from 'vitest';
import { defaultBlockStyle } from '@lumio/shared';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import { SectionTemplatesService } from './section-templates.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const USER_ID = '00000000-0000-4000-8000-000000000001';
const SECTION_ID = '00000000-0000-4000-8000-0000000000e9';

const blockStyle = { ...defaultBlockStyle, visibility: { ...defaultBlockStyle.visibility } };

const blocks = [
  {
    id: 'blk_1',
    type: 'hero',
    version: 1,
    props: { heading: 'กาแฟคั่วสด' },
    style: blockStyle,
    children: [],
  },
];

const row = (overrides: Record<string, unknown> = {}) => ({
  id: SECTION_ID,
  siteId: SITE_ID,
  name: 'ฮีโร่ร้านกาแฟ',
  blocks,
  createdBy: USER_ID,
  createdAt: new Date('2026-10-23T00:00:00Z'),
  ...overrides,
});

interface Stubs {
  db: PrismaService;
  create: Mock;
  update: Mock;
  delete: Mock;
  auditLogCreate: Mock;
}

const stubs = (findMany: unknown[] = [], findUnique: unknown = row()): Stubs => {
  const create = vi.fn().mockResolvedValue(row());
  const remove = vi.fn().mockResolvedValue({});
  const update = vi.fn().mockResolvedValue(row({ name: 'ฮีโร่ใหม่' }));
  const auditLogCreate = vi.fn().mockResolvedValue({});

  const db = {
    forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) =>
      fn({
        sectionTemplate: {
          findMany: vi.fn().mockResolvedValue(findMany),
          findUnique: vi.fn().mockResolvedValue(findUnique),
          create,
          update,
          delete: remove,
        },
        auditLog: { create: auditLogCreate },
      }),
    ),
  } as unknown as PrismaService;

  return { db, create, update, delete: remove, auditLogCreate };
};

const service = (all: Stubs): SectionTemplatesService =>
  new SectionTemplatesService(all.db, {
    log: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuditService);

describe('SectionTemplatesService', () => {
  it('lists saved sections newest first', async () => {
    const sections = await service(stubs([row()])).list(SITE_ID);

    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({ id: SECTION_ID, name: 'ฮีโร่ร้านกาแฟ' });
    expect(sections[0]?.blocks).toHaveLength(1);
  });

  it('reads a section with unreadable blocks as empty instead of throwing', async () => {
    const sections = await service(stubs([row({ blocks: 'ไม่ใช่ tree' })])).list(SITE_ID);
    expect(sections[0]?.blocks).toEqual([]);
  });

  it('saves a section with its blocks and writes an audit log', async () => {
    const all = stubs();

    const saved = await service(all).create(
      SITE_ID,
      { name: 'ฮีโร่ร้านกาแฟ', blocks },
      USER_ID,
    );

    expect(all.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ siteId: SITE_ID, name: 'ฮีโร่ร้านกาแฟ', createdBy: USER_ID }),
      }),
    );
    expect(all.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'section_template.create' }),
      }),
    );
    expect(saved.name).toBe('ฮีโร่ร้านกาแฟ');
  });

  it('deletes a saved section and reports a missing one', async () => {
    const all = stubs([], row());
    await service(all).remove(SITE_ID, SECTION_ID, USER_ID);

    expect(all.delete).toHaveBeenCalledWith({ where: { id: SECTION_ID } });
    expect(all.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'section_template.delete' }),
      }),
    );

    const missing = stubs([], null);
    await expect(service(missing).remove(SITE_ID, SECTION_ID, USER_ID)).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('renames a saved section and writes an audit log', async () => {
    const all = stubs([], row());

    const renamed = await service(all).rename(SITE_ID, SECTION_ID, { name: 'ฮีโร่ใหม่' }, USER_ID);

    expect(all.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: SECTION_ID }, data: { name: 'ฮีโร่ใหม่' } }),
    );
    expect(all.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'section_template.rename' }),
      }),
    );
    expect(renamed.name).toBe('ฮีโร่ใหม่');
  });

  it('reports a missing section when renaming', async () => {
    await expect(
      service(stubs([], null)).rename(SITE_ID, SECTION_ID, { name: 'ใหม่' }, USER_ID),
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});
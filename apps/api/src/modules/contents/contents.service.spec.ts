import { describe, expect, it, vi, type Mock } from 'vitest';
import type { BlockNode } from '@lumio/shared';
import type { AiService } from '../ai/ai.service';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { PublishService } from '../publish/publish.service';
import type { QuotaService } from '../billing/quota.service';
import { ContentsService } from './contents.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const CONTENT_ID = '00000000-0000-4000-8000-0000000000c1';
const USER_ID = '00000000-0000-4000-8000-000000000001';
const VERSION_ID = '00000000-0000-4000-8000-0000000000e1';

const blocks: BlockNode[] = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    type: 'heading',
    version: 1,
    props: { text: 'กาแฟดอยช้าง', level: 'h1', align: 'left' },
    style: {
      paddingY: 'lg',
      paddingX: 'md',
      background: 'none',
      visibility: { mobile: true, tablet: true, desktop: true },
      animation: 'none',
    },
    children: [],
  },
];

const contentRow = (overrides: Record<string, unknown> = {}) => ({
  id: CONTENT_ID,
  siteId: SITE_ID,
  type: 'page',
  title: 'หน้าแรก',
  slug: 'home',
  locale: 'th',
  status: 'draft',
  blocksDraft: blocks,
  blocksPublished: null,
  excerpt: null,
  coverMediaId: null,
  authorId: USER_ID,
  seo: { title: 'หน้าแรก', noindex: false },
  translationGroupId: null,
  revision: 3,
  publishedAt: null,
  scheduledAt: null,
  archivedAt: null,
  createdAt: new Date('2026-10-01T00:00:00Z'),
  updatedAt: new Date('2026-10-20T00:00:00Z'),
  ...overrides,
});

const auditStub = (): { log: Mock } => ({ log: vi.fn().mockResolvedValue(undefined) });

interface PublishStub {
  enqueuePage: Mock;
  enqueueSite: Mock;
  primaryHost: Mock;
}

const publishStub = (): PublishStub => ({
  enqueuePage: vi.fn().mockResolvedValue({}),
  enqueueSite: vi.fn().mockResolvedValue({}),
  primaryHost: vi.fn().mockResolvedValue(null),
});

const dbWith = (tx: Record<string, unknown>): PrismaService =>
  ({
    forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) => fn(tx)),
  }) as unknown as PrismaService;

const aiStub = (translateTexts: Mock = vi.fn().mockResolvedValue([])): AiService =>
  ({ translateTexts }) as unknown as AiService;

const quotaStub = (): QuotaService =>
  ({ assertCanAddPage: vi.fn().mockResolvedValue(undefined) }) as unknown as QuotaService;

const service = (
  tx: Record<string, unknown>,
  publish: PublishStub = publishStub(),
  ai: AiService = aiStub(),
) =>
  new ContentsService(
    dbWith(tx),
    auditStub() as unknown as AuditService,
    publish as unknown as PublishService,
    ai,
    quotaStub(),
  );

describe('ContentsService.list', () => {
  it('maps rows and returns a cursor when there are more pages', async () => {
    const rows = [contentRow(), contentRow({ id: 'c2' })];
    const contents = service({ content: { findMany: vi.fn().mockResolvedValue(rows) } });

    const page = await contents.list(SITE_ID, { limit: 1 }, {});

    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({ id: CONTENT_ID, status: 'draft', revision: 3 });
    expect(page.cursor).toBe(CONTENT_ID);
  });

  it('returns no cursor for the last page', async () => {
    const contents = service({ content: { findMany: vi.fn().mockResolvedValue([contentRow()]) } });
    const page = await contents.list(SITE_ID, { limit: 20 }, { type: 'page' });
    expect(page.cursor).toBeNull();
  });
});

describe('ContentsService.get', () => {
  it('returns the draft and published block trees', async () => {
    const contents = service({
      content: {
        findUnique: vi
          .fn()
          .mockResolvedValue(contentRow({ blocksPublished: blocks, status: 'published' })),
      },
    });

    const detail = await contents.get(SITE_ID, CONTENT_ID);

    expect(detail.blocks).toHaveLength(1);
    expect(detail.publishedBlocks).toHaveLength(1);
    expect(detail.seo).toEqual({ title: 'หน้าแรก', noindex: false });
  });

  it('hides a page from another site or a deleted one', async () => {
    const contents = service({ content: { findUnique: vi.fn().mockResolvedValue(null) } });
    await expect(contents.get(SITE_ID, CONTENT_ID)).rejects.toMatchObject({ code: 'not_found' });
  });

  it('falls back to empty blocks when stored data is not a block tree', async () => {
    const contents = service({
      content: { findUnique: vi.fn().mockResolvedValue(contentRow({ blocksDraft: 'broken' })) },
    });
    const detail = await contents.get(SITE_ID, CONTENT_ID);
    expect(detail.blocks).toEqual([]);
  });
});

describe('ContentsService page quota', () => {
  it('checks the plan before creating a page and refuses when it is full', async () => {
    const quota = { assertCanAddPage: vi.fn().mockRejectedValue(new Error('เต็ม')) };
    const contents = new ContentsService(
      dbWith({ content: { findFirst: vi.fn().mockResolvedValue(null) } }),
      auditStub() as unknown as AuditService,
      publishStub() as unknown as PublishService,
      aiStub(),
      quota as never,
    );

    await expect(
      contents.create(
        SITE_ID,
        { type: 'page', title: 'หน้าใหม่', slug: 'new', locale: 'th', blocks: [], seo: { noindex: false } },
        USER_ID,
      ),
    ).rejects.toThrow('เต็ม');
    expect(quota.assertCanAddPage).toHaveBeenCalledWith(SITE_ID);
  });

  it('does not count posts against the page quota', async () => {
    const quota = { assertCanAddPage: vi.fn().mockResolvedValue(undefined) };
    const contents = new ContentsService(
      dbWith({
        content: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(contentRow({ type: 'post' })),
        },
      }),
      auditStub() as unknown as AuditService,
      publishStub() as unknown as PublishService,
      aiStub(),
      quota as never,
    );

    await contents.create(
      SITE_ID,
      { type: 'post', title: 'บทความ', slug: 'post', locale: 'th', blocks: [], seo: { noindex: false } },
      USER_ID,
    );

    expect(quota.assertCanAddPage).not.toHaveBeenCalled();
  });
});

describe('ContentsService.create', () => {
  it('stores the draft, records an audit entry and starts at revision 1', async () => {
    const audit = auditStub();
    const findFirst = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue(contentRow({ revision: 1 }));
    const contents = new ContentsService(
      dbWith({ content: { findFirst, create } }),
      audit as unknown as AuditService,
      publishStub() as unknown as PublishService,
      aiStub(),
      quotaStub(),
    );

    const detail = await contents.create(
      SITE_ID,
      { type: 'page', title: 'หน้าแรก', slug: 'home', locale: 'th', blocks: [], seo: { noindex: false } },
      USER_ID,
    );

    expect(detail.id).toBe(CONTENT_ID);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ siteId: SITE_ID, slug: 'home', revision: 1 }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'content.create' }));
  });

  it('rejects a slug that already exists in the same site, locale and type', async () => {
    const contents = service({ content: { findFirst: vi.fn().mockResolvedValue({ id: 'other' }) } });

    await expect(
      contents.create(
        SITE_ID,
        { type: 'page', title: 'ซ้ำ', slug: 'home', locale: 'th', blocks: [], seo: { noindex: false } },
        USER_ID,
      ),
    ).rejects.toMatchObject({ code: 'conflict', message: 'ชื่อลิงก์นี้ถูกใช้แล้ว' });
  });
});

describe('ContentsService.update', () => {
  it('bumps the revision when the editor sends new blocks', async () => {
    const update = vi.fn().mockResolvedValue(contentRow({ revision: 4 }));
    const contents = service({
      content: {
        findUnique: vi.fn().mockResolvedValue(contentRow()),
        findFirst: vi.fn().mockResolvedValue(null),
        update,
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    });

    await contents.update(SITE_ID, CONTENT_ID, { title: 'หน้าแรกใหม่', blocks }, USER_ID);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ revision: 4 }) }),
    );
  });

  it('keeps the revision when only metadata changes', async () => {
    const update = vi.fn().mockResolvedValue(contentRow());
    const contents = service({
      content: {
        findUnique: vi.fn().mockResolvedValue(contentRow()),
        findFirst: vi.fn().mockResolvedValue(null),
        update,
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    });

    await contents.update(SITE_ID, CONTENT_ID, { title: 'ชื่อใหม่' }, USER_ID);

    const call = update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call.data.revision).toBeUndefined();
  });
});

describe('ContentsService.updateSeo', () => {
  it('merges the new meta text into what the page already had', async () => {
    const update = vi.fn().mockResolvedValue(
      contentRow({ seo: { title: 'กาแฟดอย', description: 'กาแฟคั่วเอง', noindex: true } }),
    );
    const auditCreate = vi.fn().mockResolvedValue({});
    const contents = service({
      content: {
        findUnique: vi
          .fn()
          .mockResolvedValue(
            contentRow({ seo: { title: 'ชื่อเดิม', description: 'คำอธิบายเดิม', noindex: true } }),
          ),
        update,
      },
      auditLog: { create: auditCreate },
    });

    const detail = await contents.updateSeo(
      SITE_ID,
      CONTENT_ID,
      { title: 'กาแฟดอย', description: 'กาแฟคั่วเอง' },
      USER_ID,
    );

    const call = update.mock.calls[0]?.[0] as { data: { seo: unknown } };
    expect(call.data.seo).toEqual({
      title: 'กาแฟดอย',
      description: 'กาแฟคั่วเอง',
      noindex: true,
    });
    expect(detail.seo).toMatchObject({ title: 'กาแฟดอย', noindex: true });
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'content.seo' }) }),
    );
  });

  it('leaves the description and noindex alone when only the title is sent', async () => {
    const update = vi.fn().mockResolvedValue(contentRow());
    const contents = service({
      content: {
        findUnique: vi
          .fn()
          .mockResolvedValue(
            contentRow({ seo: { title: '', description: 'คำอธิบายเดิม', noindex: true } }),
          ),
        update,
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    });

    await contents.updateSeo(SITE_ID, CONTENT_ID, { title: 'ชื่อใหม่' }, USER_ID);

    const call = update.mock.calls[0]?.[0] as { data: { seo: unknown } };
    expect(call.data.seo).toEqual({
      title: 'ชื่อใหม่',
      description: 'คำอธิบายเดิม',
      noindex: true,
    });
  });

  it('rebuilds a published page so the public HTML carries the new wording', async () => {
    const publish = publishStub();
    const contents = service(
      {
        content: {
          findUnique: vi.fn().mockResolvedValue(contentRow({ status: 'published' })),
          update: vi.fn().mockResolvedValue(contentRow({ status: 'published' })),
        },
        auditLog: { create: vi.fn().mockResolvedValue({}) },
      },
      publish,
    );

    await contents.updateSeo(SITE_ID, CONTENT_ID, { description: 'ใหม่' }, USER_ID);

    expect(publish.enqueuePage).toHaveBeenCalledWith({
      siteId: SITE_ID,
      type: 'page',
      slug: 'home',
      locale: 'th',
    });
  });

  it('hides a page of another site', async () => {
    const contents = service({ content: { findUnique: vi.fn().mockResolvedValue(null) } });

    await expect(
      contents.updateSeo(SITE_ID, CONTENT_ID, { title: 'x' }, USER_ID),
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('ContentsService.saveBlocks', () => {
  it('rejects a save based on an outdated revision', async () => {
    const contents = service({
      content: { findUnique: vi.fn().mockResolvedValue({ revision: 9 }) },
    });

    await expect(
      contents.saveBlocks(SITE_ID, CONTENT_ID, { blocks, baseRevision: 8 }),
    ).rejects.toMatchObject({ code: 'conflict', message: 'มีคนอื่นแก้หน้านี้ไปแล้ว' });
  });

  it('stores the draft and reports the next revision', async () => {
    const contents = service({
      content: {
        findUnique: vi.fn().mockResolvedValue({ revision: 3 }),
        update: vi
          .fn()
          .mockResolvedValue({ revision: 4, updatedAt: new Date('2026-10-20T08:15:03Z') }),
      },
    });

    const result = await contents.saveBlocks(SITE_ID, CONTENT_ID, { blocks, baseRevision: 3 });

    expect(result).toEqual({ revision: 4, savedAt: '2026-10-20T08:15:03.000Z' });
  });

  it('hides a page that does not exist', async () => {
    const contents = service({ content: { findUnique: vi.fn().mockResolvedValue(null) } });
    await expect(
      contents.saveBlocks(SITE_ID, CONTENT_ID, { blocks, baseRevision: 1 }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('ContentsService.publish', () => {
  it('copies the draft to the public site, snapshots a version and audits it', async () => {
    const versionCreate = vi.fn().mockResolvedValue({});
    const auditLogCreate = vi.fn().mockResolvedValue({});
    const update = vi.fn().mockResolvedValue({ revision: 3 });
    const publish = publishStub();
    const contents = service(
      {
        content: { findUnique: vi.fn().mockResolvedValue(contentRow()), update },
        contentVersion: { create: versionCreate },
        auditLog: { create: auditLogCreate },
      },
      publish,
    );

    const result = await contents.publish(SITE_ID, CONTENT_ID, USER_ID);

    expect(result.revision).toBe(3);
    expect(versionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ contentId: CONTENT_ID }) }),
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'published' }),
      }),
    );
    expect(auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'content.publish' }) }),
    );
    expect(publish.enqueuePage).toHaveBeenCalledWith({
      siteId: SITE_ID,
      type: 'page',
      slug: 'home',
      locale: 'th',
    });
  });

  it('does not queue a rebuild when the publish failed', async () => {
    const publish = publishStub();
    const contents = service({ content: { findUnique: vi.fn().mockResolvedValue(null) } }, publish);

    await expect(contents.publish(SITE_ID, CONTENT_ID, USER_ID)).rejects.toMatchObject({
      code: 'not_found',
    });
    expect(publish.enqueuePage).not.toHaveBeenCalled();
  });
});

describe('ContentsService.remove', () => {
  it('deletes the page and records who removed it', async () => {
    const deleteFn = vi.fn().mockResolvedValue({});
    const auditLogCreate = vi.fn().mockResolvedValue({});
    const contents = service({
      content: { findUnique: vi.fn().mockResolvedValue(contentRow()), delete: deleteFn },
      auditLog: { create: auditLogCreate },
    });

    await contents.remove(SITE_ID, CONTENT_ID, USER_ID);

    expect(deleteFn).toHaveBeenCalledWith({ where: { id: CONTENT_ID } });
    expect(auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'content.delete' }) }),
    );
  });
});

describe('ContentsService versions', () => {
  const versionRow = (overrides: Record<string, unknown> = {}) => ({
    id: VERSION_ID,
    note: 'เผยแพร่',
    createdAt: new Date('2026-10-20T08:00:00Z'),
    createdBy: USER_ID,
    blocks,
    author: { name: 'สมชาย', email: 'owner@example.com' },
    ...overrides,
  });

  it('lists the newest versions first with author and section count', async () => {
    const contents = service({
      contentVersion: { findMany: vi.fn().mockResolvedValue([versionRow()]) },
    });

    const versions = await contents.listVersions(SITE_ID, CONTENT_ID);

    expect(versions).toEqual([
      {
        id: VERSION_ID,
        note: 'เผยแพร่',
        createdAt: '2026-10-20T08:00:00.000Z',
        authorId: USER_ID,
        authorName: 'สมชาย',
        blockCount: 1,
      },
    ]);
  });

  it('falls back to the email when the author has no display name', async () => {
    const contents = service({
      contentVersion: {
        findMany: vi
          .fn()
          .mockResolvedValue([versionRow({ author: { name: null, email: 'owner@example.com' } })]),
      },
    });

    const [version] = await contents.listVersions(SITE_ID, CONTENT_ID);

    expect(version?.authorName).toBe('owner@example.com');
  });

  it('returns one version with its blocks for the preview', async () => {
    const contents = service({
      contentVersion: { findFirst: vi.fn().mockResolvedValue(versionRow()) },
    });

    const detail = await contents.getVersion(SITE_ID, CONTENT_ID, VERSION_ID);

    expect(detail.blocks).toHaveLength(1);
    expect(detail.blockCount).toBe(1);
  });

  it('hides a version that does not belong to the page', async () => {
    const contents = service({ contentVersion: { findFirst: vi.fn().mockResolvedValue(null) } });
    await expect(
      contents.getVersion(SITE_ID, CONTENT_ID, VERSION_ID),
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it('saves a manual version of the current draft and audits it', async () => {
    const create = vi.fn().mockResolvedValue(versionRow({ note: 'ก่อนแก้ราคา' }));
    const auditLogCreate = vi.fn().mockResolvedValue({});
    const contents = service({
      content: { findUnique: vi.fn().mockResolvedValue({ blocksDraft: blocks }) },
      contentVersion: { create },
      auditLog: { create: auditLogCreate },
    });

    const version = await contents.createVersion(
      SITE_ID,
      CONTENT_ID,
      { note: 'ก่อนแก้ราคา' },
      USER_ID,
    );

    expect(version.note).toBe('ก่อนแก้ราคา');
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ contentId: CONTENT_ID, createdBy: USER_ID }),
      }),
    );
    expect(auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'content.version.create' }),
      }),
    );
  });

  it('restores an old version into the draft and bumps the revision', async () => {
    const auditLogCreate = vi.fn().mockResolvedValue({});
    const contents = service({
      contentVersion: {
        findFirst: vi.fn().mockResolvedValue({ id: VERSION_ID, blocks }),
      },
      content: {
        findUnique: vi.fn().mockResolvedValue({ revision: 5 }),
        update: vi
          .fn()
          .mockResolvedValue({ revision: 6, updatedAt: new Date('2026-10-20T09:00:00Z') }),
      },
      auditLog: { create: auditLogCreate },
    });

    const result = await contents.restoreVersion(SITE_ID, CONTENT_ID, VERSION_ID, USER_ID);

    expect(result.revision).toBe(6);
    expect(auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'content.restore' }) }),
    );
  });

  it('hides a version that does not belong to the page', async () => {
    const contents = service({ contentVersion: { findFirst: vi.fn().mockResolvedValue(null) } });
    await expect(
      contents.restoreVersion(SITE_ID, CONTENT_ID, VERSION_ID, USER_ID),
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});

describe('ContentsService trash', () => {
  it('stamps archived_at and rebuilds the public path when a live page is trashed', async () => {
    const update = vi.fn().mockResolvedValue(contentRow({ status: 'archived' }));
    const publish = publishStub();
    const contents = service(
      {
        content: {
          findUnique: vi.fn().mockResolvedValue(contentRow({ status: 'published' })),
          update,
        },
        auditLog: { create: vi.fn().mockResolvedValue({}) },
      },
      publish,
    );

    await contents.update(SITE_ID, CONTENT_ID, { status: 'archived' }, USER_ID);

    const call = update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call.data.archivedAt).toBeInstanceOf(Date);
    expect(call.data.status).toBe('archived');
    expect(publish.enqueuePage).toHaveBeenCalledWith({
      siteId: SITE_ID,
      type: 'page',
      slug: 'home',
      locale: 'th',
    });
  });

  it('does not rebuild the public path when a draft is trashed', async () => {
    const publish = publishStub();
    const contents = service(
      {
        content: {
          findUnique: vi.fn().mockResolvedValue(contentRow({ status: 'draft' })),
          update: vi.fn().mockResolvedValue(contentRow({ status: 'archived' })),
        },
        auditLog: { create: vi.fn().mockResolvedValue({}) },
      },
      publish,
    );

    await contents.update(SITE_ID, CONTENT_ID, { status: 'archived' }, USER_ID);

    expect(publish.enqueuePage).not.toHaveBeenCalled();
  });

  it('clears archived_at when a page leaves the trash', async () => {
    const update = vi.fn().mockResolvedValue(contentRow({ status: 'draft' }));
    const contents = service({
      content: {
        findUnique: vi
          .fn()
          .mockResolvedValue(contentRow({ status: 'archived', archivedAt: new Date() })),
        update,
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    });

    await contents.update(SITE_ID, CONTENT_ID, { status: 'draft' }, USER_ID);

    const call = update.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call.data.archivedAt).toBeNull();
  });

  it('brings a trashed page back as a draft and audits it', async () => {
    const auditLogCreate = vi.fn().mockResolvedValue({});
    const contents = service({
      content: {
        findUnique: vi
          .fn()
          .mockResolvedValue(contentRow({ status: 'archived', archivedAt: new Date() })),
        update: vi.fn().mockResolvedValue(contentRow({ status: 'draft', archivedAt: null })),
      },
      auditLog: { create: auditLogCreate },
    });

    const detail = await contents.restore(SITE_ID, CONTENT_ID, USER_ID);

    expect(detail.status).toBe('draft');
    expect(auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'content.restore' }) }),
    );
  });

  it('refuses to restore a page that is not in the trash', async () => {
    const contents = service({
      content: { findUnique: vi.fn().mockResolvedValue(contentRow({ status: 'draft' })) },
    });

    await expect(contents.restore(SITE_ID, CONTENT_ID, USER_ID)).rejects.toMatchObject({
      code: 'conflict',
    });
  });

  it('purges only the pages that aged out, per site', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const auditCreateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findMany = vi.fn().mockResolvedValue([
      { id: 'expired', title: 'หน้าเก่า', slug: 'old', type: 'page' },
    ]);
    const db = {
      site: { findMany: vi.fn().mockResolvedValue([{ id: SITE_ID }, { id: 'site-2' }]) },
      forSite: vi.fn(async (_siteId: string, fn: (client: unknown) => unknown) =>
        fn({ content: { findMany, deleteMany }, auditLog: { createMany: auditCreateMany } }),
      ),
    } as unknown as PrismaService;
    const contents = new ContentsService(
      db,
      auditStub() as unknown as AuditService,
      publishStub() as unknown as PublishService,
      aiStub(),
      quotaStub(),
    );

    const summary = await contents.purgeExpiredTrash(new Date('2026-12-01T00:00:00Z'));

    expect(summary.sites).toBe(2);
    expect(summary.purged).toBe(2);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'archived' }),
      }),
    );
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['expired'] } } });
  });
});

describe('ContentsService.translations', () => {
  it('lists every offered language and marks the missing ones', async () => {
    const contents = service({
      content: {
        findUnique: vi.fn().mockResolvedValue({ id: CONTENT_ID, translationGroupId: null }),
        findMany: vi.fn().mockResolvedValue([
          { id: CONTENT_ID, locale: 'th', title: 'หน้าแรก', slug: 'home', status: 'published' },
        ]),
      },
      site: {
        findUnique: vi.fn().mockResolvedValue({ locales: ['th', 'en'], localeDefault: 'th' }),
      },
    });

    const result = await contents.translations(SITE_ID, CONTENT_ID);

    expect(result.defaultLocale).toBe('th');
    expect(result.items.map((item) => item.locale)).toEqual(['th', 'en']);
    expect(result.items[0]).toMatchObject({ exists: true, slug: 'home', status: 'published' });
    expect(result.items[1]).toMatchObject({ exists: false, contentId: null, status: null });
  });

  it('hides a page that belongs to another site', async () => {
    const contents = service({ content: { findUnique: vi.fn().mockResolvedValue(null) } });
    await expect(contents.translations(SITE_ID, CONTENT_ID)).rejects.toMatchObject({
      code: 'not_found',
    });
  });
});

describe('ContentsService.createTranslation', () => {
  const translationTx = (overrides: Record<string, unknown> = {}) => ({
    content: {
      findUnique: vi.fn().mockResolvedValue(contentRow()),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi
        .fn()
        .mockResolvedValue(
          contentRow({ id: 'c-en', locale: 'en', translationGroupId: CONTENT_ID, title: 'Home' }),
        ),
      update: vi.fn().mockResolvedValue({}),
    },
    site: { findUnique: vi.fn().mockResolvedValue({ locales: ['th', 'en'], localeDefault: 'th' }) },
    ...overrides,
  });

  it('copies the structure, joins the group and lands as a draft', async () => {
    const tx = translationTx();
    const contents = service(tx);

    const detail = await contents.createTranslation(
      SITE_ID,
      CONTENT_ID,
      { locale: 'en', translate: false },
      USER_ID,
    );

    expect(detail.locale).toBe('en');
    const create = tx.content.create as Mock;
    const data = (create.mock.calls[0]?.[0] as { data: Record<string, unknown> }).data;
    expect(data.translationGroupId).toBe(CONTENT_ID);
    expect(data.locale).toBe('en');
    expect(data.slug).toBe('home');
    // The copy keeps the structure but with fresh block ids.
    const copied = data.blocksDraft as BlockNode[];
    expect(copied).toHaveLength(1);
    expect(copied[0]?.id).not.toBe(blocks[0]?.id);
    expect(copied[0]?.props.text).toBe('กาแฟดอยช้าง');
    // The original joins the group so the pair shares one id.
    expect(tx.content.update).toHaveBeenCalledWith({
      where: { id: CONTENT_ID },
      data: { translationGroupId: CONTENT_ID },
    });
  });

  it('refuses a language the site has not enabled', async () => {
    const contents = service({
      content: { findUnique: vi.fn().mockResolvedValue(contentRow()) },
      site: { findUnique: vi.fn().mockResolvedValue({ locales: ['th'], localeDefault: 'th' }) },
    });

    await expect(
      contents.createTranslation(SITE_ID, CONTENT_ID, { locale: 'en', translate: false }, USER_ID),
    ).rejects.toMatchObject({ code: 'validation_error' });
  });

  it('refuses translating a page into the language it is already in', async () => {
    const contents = service({
      content: { findUnique: vi.fn().mockResolvedValue(contentRow()) },
      site: {
        findUnique: vi.fn().mockResolvedValue({ locales: ['th', 'en'], localeDefault: 'th' }),
      },
    });

    await expect(
      contents.createTranslation(SITE_ID, CONTENT_ID, { locale: 'th', translate: false }, USER_ID),
    ).rejects.toMatchObject({ code: 'conflict' });
  });

  it('refuses a slug already used in the target language', async () => {
    const tx = translationTx();
    tx.content.findFirst = vi.fn().mockResolvedValue({ id: 'other' });
    const contents = service(tx);

    await expect(
      contents.createTranslation(SITE_ID, CONTENT_ID, { locale: 'en', translate: false }, USER_ID),
    ).rejects.toMatchObject({ code: 'conflict' });
  });

  it('translates the copy with the assistant when asked', async () => {
    const translateTexts = vi.fn().mockResolvedValue(['Doi Chang coffee']);
    const contents = service(translationTx(), publishStub(), aiStub(translateTexts));

    await contents.createTranslation(SITE_ID, CONTENT_ID, { locale: 'en', translate: true }, USER_ID);

    expect(translateTexts).toHaveBeenCalledWith(SITE_ID, USER_ID, ['กาแฟดอยช้าง'], 'en');
  });

  it('does not call the assistant when translation is not requested', async () => {
    const translateTexts = vi.fn().mockResolvedValue([]);
    const contents = service(translationTx(), publishStub(), aiStub(translateTexts));

    await contents.createTranslation(
      SITE_ID,
      CONTENT_ID,
      { locale: 'en', translate: false },
      USER_ID,
    );

    expect(translateTexts).not.toHaveBeenCalled();
  });
});

describe('ContentsService.translateContent', () => {
  const blocksWithText = (text: string): BlockNode[] => [
    { ...blocks[0]!, props: { ...blocks[0]!.props, text } },
  ];

  const txFor = (
    row: Record<string, unknown>,
    source: Record<string, unknown> | null = null,
  ) => ({
    content: {
      findUnique: vi.fn().mockResolvedValue(row),
      findFirst: vi.fn().mockResolvedValue(source),
    },
    site: { findUnique: vi.fn().mockResolvedValue({ localeDefault: 'th' }) },
  });

  it('translates the copy into its own language and returns the updated tree', async () => {
    const translateTexts = vi.fn().mockResolvedValue(['Doi Chang coffee']);
    const tx = txFor(contentRow({ locale: 'en', blocksDraft: blocks }), { blocksDraft: blocks });
    const contents = service(tx, publishStub(), aiStub(translateTexts));

    const result = await contents.translateContent(
      SITE_ID,
      CONTENT_ID,
      { onlyMissing: true },
      USER_ID,
    );

    expect(translateTexts).toHaveBeenCalledWith(SITE_ID, USER_ID, ['กาแฟดอยช้าง'], 'en');
    expect(result.translatedCount).toBe(1);
    expect(result.totalCount).toBe(1);
    expect(result.blocks[0]?.props.text).toBe('Doi Chang coffee');
  });

  it('skips text that already differs from the source language', async () => {
    const translateTexts = vi.fn().mockResolvedValue([]);
    const tx = txFor(contentRow({ locale: 'en', blocksDraft: blocksWithText('Doi Chang coffee') }), {
      blocksDraft: blocks,
    });
    const contents = service(tx, publishStub(), aiStub(translateTexts));

    const result = await contents.translateContent(
      SITE_ID,
      CONTENT_ID,
      { onlyMissing: true },
      USER_ID,
    );

    expect(translateTexts).not.toHaveBeenCalled();
    expect(result.translatedCount).toBe(0);
    expect(result.blocks[0]?.props.text).toBe('Doi Chang coffee');
  });

  it('translates every text when onlyMissing is false', async () => {
    const translateTexts = vi.fn().mockResolvedValue(['Doi Chang coffee']);
    const tx = txFor(contentRow({ locale: 'en', blocksDraft: blocksWithText('Doi Chang coffee') }), {
      blocksDraft: blocks,
    });
    const contents = service(tx, publishStub(), aiStub(translateTexts));

    await contents.translateContent(SITE_ID, CONTENT_ID, { onlyMissing: false }, USER_ID);

    expect(translateTexts).toHaveBeenCalledWith(SITE_ID, USER_ID, ['Doi Chang coffee'], 'en');
  });

  it('writes an audit entry for the translation run', async () => {
    const audit = auditStub();
    const tx = txFor(contentRow({ locale: 'en' }), { blocksDraft: blocks });
    const contents = new ContentsService(
      dbWith(tx),
      audit as unknown as AuditService,
      publishStub() as unknown as PublishService,
      aiStub(vi.fn().mockResolvedValue(['Doi Chang coffee'])),
      quotaStub(),
    );

    await contents.translateContent(SITE_ID, CONTENT_ID, { onlyMissing: true }, USER_ID);

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'content.translate-texts', target: CONTENT_ID }),
    );
  });

  it('refuses to translate the site default language', async () => {
    const contents = service(txFor(contentRow({ locale: 'th' })));

    await expect(
      contents.translateContent(SITE_ID, CONTENT_ID, { onlyMissing: true }, USER_ID),
    ).rejects.toMatchObject({ code: 'conflict' });
  });

  it('refuses a language the assistant cannot translate yet', async () => {
    const contents = service(txFor(contentRow({ locale: 'fr' })));

    await expect(
      contents.translateContent(SITE_ID, CONTENT_ID, { onlyMissing: true }, USER_ID),
    ).rejects.toMatchObject({ code: 'validation_error' });
  });

  it('reports a page of another site as not found', async () => {
    const contents = service(txFor(null as unknown as Record<string, unknown>));

    await expect(
      contents.translateContent(SITE_ID, CONTENT_ID, { onlyMissing: true }, USER_ID),
    ).rejects.toMatchObject({ code: 'not_found' });
  });
});

import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma, type Content } from '@prisma/client';
import {
  AI_LOCALES,
  applyBlockTranslations,
  blockTreeSchema,
  collectBlockTexts,
  CONTENT_TRASH_RETENTION_DAYS,
  DEFAULT_LOCALE,
  isContentStatus,
  isContentType,
  mapBlockTexts,
  missingTranslationIndexes,
  seoSchema,
  translationCoverage,
  type BlockNode,
  type BlockTree,
  type ContentDetail,
  type ContentListQuery,
  type ContentSummary,
  type ContentTranslations,
  type ContentTranslationLink,
  type ContentType,
  type ContentVersionDetail,
  type ContentVersionSummary,
  type CreateContentInput,
  type CreateContentVersionInput,
  type CreateTranslationInput,
  type PaginationQuery,
  type SaveContentBlocksInput,
  type SaveContentBlocksResult,
  type Seo,
  type SeoPatch,
  type TranslatableText,
  type TranslateContentInput,
  type TranslateContentResult,
  type UpdateContentInput,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import type { Page } from '../../common/pagination';
import { signPreviewToken } from '../../common/preview-token';
import { AiService } from '../ai/ai.service';
import { AuditService } from '../audit/audit.service';
import { QuotaService } from '../billing/quota.service';
import { publicSiteUrl } from '../commerce/order-notifier';
import { PrismaService } from '../prisma/prisma.service';
import { PublishService } from '../publish/publish.service';

export interface PublishResult {
  revision: number;
  publishedAt: string;
}

export interface TrashPurgeSummary {
  /** Sites scanned by this run. */
  sites: number;
  /** Pages and posts deleted because they had aged out of the trash. */
  purged: number;
}

/** A version row with the author joined in, as the history list needs it. */
interface VersionRow {
  id: string;
  note: string | null;
  createdAt: Date;
  createdBy: string | null;
  blocks: unknown;
  author: { name: string | null; email: string } | null;
}

const versionInclude = { author: { select: { name: true, email: true } } } as const;

/** Reads stored blocks defensively: bad data must never break the editor. */
const readBlocks = (value: unknown): BlockTree => {
  const parsed = blockTreeSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
};

const readSeo = (value: unknown): Seo => {
  const parsed = seoSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : { noindex: false };
};

/** Merges only the fields the caller sent, so untouched meta text stays as is. */
const mergeSeo = (current: unknown, patch: SeoPatch): Seo => ({
  ...readSeo(current),
  ...(patch.title === undefined ? {} : { title: patch.title }),
  ...(patch.description === undefined ? {} : { description: patch.description }),
  ...(patch.ogImage === undefined ? {} : { ogImage: patch.ogImage }),
  ...(patch.noindex === undefined ? {} : { noindex: patch.noindex }),
});

const toSummary = (row: Content): ContentSummary => ({
  id: row.id,
  type: isContentType(row.type) ? row.type : 'page',
  title: row.title,
  slug: row.slug,
  status: isContentStatus(row.status) ? row.status : 'draft',
  locale: row.locale,
  // A page with no translations yet is its own group, so the switcher can always
  // ask "what other languages does this page have?".
  translationGroupId: row.translationGroupId ?? row.id,
  excerpt: row.excerpt,
  revision: row.revision,
  updatedAt: row.updatedAt.toISOString(),
  publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
  archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
});

const toDetail = (row: Content): ContentDetail => ({
  ...toSummary(row),
  blocks: readBlocks(row.blocksDraft),
  publishedBlocks: row.blocksPublished === null ? null : readBlocks(row.blocksPublished),
  seo: readSeo(row.seo),
  createdAt: row.createdAt.toISOString(),
});

const asJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

const toVersionSummary = (row: VersionRow): ContentVersionSummary => ({
  id: row.id,
  note: row.note,
  createdAt: row.createdAt.toISOString(),
  authorId: row.createdBy,
  authorName: row.author?.name ?? row.author?.email ?? null,
  blockCount: readBlocks(row.blocks).length,
});

const isUniqueViolation = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';

/** Copies a block tree with fresh ids, so translated pages never share block ids. */
const cloneBlockTree = (blocks: BlockNode[]): BlockNode[] =>
  blocks.map((block) => ({
    ...block,
    id: randomUUID(),
    props: { ...block.props },
    children: cloneBlockTree(block.children),
  }));

@Injectable()
export class ContentsService {
  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
    private readonly publishJobs: PublishService,
    private readonly ai: AiService,
    private readonly quota: QuotaService,
  ) {}

  async list(
    siteId: string,
    page: PaginationQuery,
    filters: Pick<ContentListQuery, 'type' | 'status' | 'q' | 'locale'>,
  ): Promise<Page<ContentSummary>> {
    const rows = await this.db.forSite(siteId, (tx) =>
      tx.content.findMany({
        where: {
          ...(filters.type ? { type: filters.type } : {}),
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.locale ? { locale: filters.locale } : {}),
          ...(filters.q ? { title: { contains: filters.q, mode: 'insensitive' } } : {}),
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        take: page.limit + 1,
        ...(page.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
      }),
    );

    const items = rows.slice(0, page.limit).map(toSummary);
    return { items, cursor: rows.length > page.limit ? (items.at(-1)?.id ?? null) : null };
  }

  async get(siteId: string, contentId: string): Promise<ContentDetail> {
    const row = await this.db.forSite(siteId, (tx) =>
      tx.content.findUnique({ where: { id: contentId } }),
    );
    if (!row) throw ApiException.notFound('ไม่พบหน้านี้');
    return toDetail(row);
  }

  /**
   * Mints a preview URL for one page. The renderer reads the draft through the
   * signed token, so an editor can review a page before publishing and no
   * anonymous visitor can see unpublished content (docs/design/10-architecture.md 10.4).
   */
  async createPreviewLink(
    siteId: string,
    contentId: string,
    actorId: string,
  ): Promise<{ url: string; expiresAt: string }> {
    const row = await this.db.forSite(siteId, (tx) =>
      tx.content.findUnique({ where: { id: contentId }, select: { id: true } }),
    );
    if (!row) throw ApiException.notFound('ไม่พบหน้านี้');

    const site = await this.db.forSite(siteId, (tx) =>
      tx.site.findUnique({
        where: { id: siteId },
        select: {
          subdomain: true,
          settings: true,
          domains: {
            where: { isPrimary: true, sslStatus: 'active' },
            select: { hostname: true, isPrimary: true, sslStatus: true },
          },
        },
      }),
    );
    if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');

    let signed: { token: string; expiresAt: Date };
    try {
      signed = signPreviewToken(contentId, siteId);
    } catch (error) {
      throw ApiException.conflict(
        error instanceof Error ? error.message : 'ยังไม่ได้ตั้งค่าลิงก์ตัวอย่าง',
      );
    }

    const base = (process.env.RENDERER_URL ?? publicSiteUrl(site)).replace(/\/+$/, '');
    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'content.preview_link',
      target: contentId,
      meta: { expiresAt: signed.expiresAt.toISOString() },
    });

    return {
      url: `${base}/preview/${signed.token}`,
      expiresAt: signed.expiresAt.toISOString(),
    };
  }

  async create(
    siteId: string,
    input: CreateContentInput,
    actorId: string,
  ): Promise<ContentDetail> {
    if (input.type === 'page') await this.quota.assertCanAddPage(siteId);
    await this.assertSlugFree(siteId, input);

    try {
      const row = await this.db.forSite(siteId, (tx) =>
        tx.content.create({
          data: {
            siteId,
            type: input.type,
            title: input.title,
            slug: input.slug,
            locale: input.locale,
            excerpt: input.excerpt ?? null,
            blocksDraft: asJson(input.blocks),
            seo: asJson(input.seo),
            authorId: actorId,
            revision: 1,
          },
        }),
      );

      await this.audit.log({
        siteId,
        userId: actorId,
        action: 'content.create',
        target: row.id,
        meta: { type: row.type, slug: row.slug },
      });

      return toDetail(row);
    } catch (error) {
      if (isUniqueViolation(error)) throw ApiException.conflict('ชื่อลิงก์นี้ถูกใช้แล้ว');
      throw error;
    }
  }

  async update(
    siteId: string,
    contentId: string,
    input: UpdateContentInput,
    actorId: string,
  ): Promise<ContentDetail> {
    const { row, wasPublished } = await this.db.forSite(siteId, async (tx) => {
      const current = await tx.content.findUnique({ where: { id: contentId } });
      if (!current) throw ApiException.notFound('ไม่พบหน้านี้');

      if (input.slug || input.type || input.locale) {
        await this.assertSlugFree(
          siteId,
          {
            type: input.type ?? (isContentType(current.type) ? current.type : 'page'),
            locale: input.locale ?? current.locale,
            slug: input.slug ?? current.slug,
          },
          contentId,
        );
      }

      // Moving to the trash stamps the time the purge job counts from; leaving
      // the trash clears it again so a restored page never looks expiring.
      const archivedAt =
        input.status === undefined
          ? undefined
          : input.status === 'archived'
            ? (current.archivedAt ?? new Date())
            : null;

      const nextBlocks = input.blocks === undefined ? null : asJson(input.blocks);
      const updated = await tx.content.update({
        where: { id: contentId },
        data: {
          title: input.title ?? undefined,
          slug: input.slug ?? undefined,
          type: input.type ?? undefined,
          locale: input.locale ?? undefined,
          excerpt: input.excerpt ?? undefined,
          seo: input.seo === undefined ? undefined : asJson(input.seo),
          status: input.status ?? undefined,
          ...(archivedAt === undefined ? {} : { archivedAt }),
          ...(nextBlocks
            ? { blocksDraft: nextBlocks, revision: current.revision + 1 }
            : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'content.update',
          target: contentId,
          meta: { fields: Object.keys(input) } satisfies Prisma.InputJsonObject,
        },
      });

      return {
        row: updated,
        wasPublished: current.status === 'published' && input.status === 'archived',
      };
    });

    // A page that was live must disappear from the public site as soon as it is
    // trashed, so the renderer rebuilds the path it used to occupy.
    if (wasPublished) {
      await this.publishJobs.enqueuePage({
        siteId,
        type: isContentType(row.type) ? row.type : 'page',
        slug: row.slug,
        locale: row.locale,
      });
    }

    return toDetail(row);
  }

  /**
   * Fixes only the meta text of a page (docs/design/14-seo-performance.md 14.1).
   * The fields are merged into the stored object, so the SEO screen (including
   * the assistant's suggestion) can write the title without wiping the
   * description or the `noindex` flag. A published page is rebuilt so the public
   * HTML carries the new wording.
   */
  async updateSeo(
    siteId: string,
    contentId: string,
    patch: SeoPatch,
    actorId: string,
  ): Promise<ContentDetail> {
    const { row, republish } = await this.db.forSite(siteId, async (tx) => {
      const current = await tx.content.findUnique({ where: { id: contentId } });
      if (!current) throw ApiException.notFound('ไม่พบหน้านี้');

      const updated = await tx.content.update({
        where: { id: contentId },
        data: { seo: asJson(mergeSeo(current.seo, patch)) },
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'content.seo',
          target: contentId,
          meta: { fields: Object.keys(patch) },
        },
      });

      return { row: updated, republish: current.status === 'published' };
    });

    if (republish) {
      await this.publishJobs.enqueuePage({
        siteId,
        type: isContentType(row.type) ? row.type : 'page',
        slug: row.slug,
        locale: row.locale,
      });
    }

    return toDetail(row);
  }

  async remove(siteId: string, contentId: string, actorId: string): Promise<void> {
    const removed = await this.db.forSite(siteId, async (tx) => {
      const current = await tx.content.findUnique({ where: { id: contentId } });
      if (!current) throw ApiException.notFound('ไม่พบหน้านี้');

      await tx.content.delete({ where: { id: contentId } });
      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'content.delete',
          target: contentId,
          meta: { title: current.title, slug: current.slug },
        },
      });

      return {
        type: isContentType(current.type) ? current.type : ('page' as ContentType),
        slug: current.slug,
        locale: current.locale,
        wasPublished: current.status === 'published',
      };
    });

    // A deleted page must disappear from the public site and the sitemap.
    if (removed.wasPublished) {
      await this.publishJobs.enqueuePage({
        siteId,
        type: removed.type,
        slug: removed.slug,
        locale: removed.locale,
      });
    }
  }

  /**
   * Autosave. `baseRevision` is the revision the editor last saw, so a stale tab
   * gets a 409 instead of silently overwriting newer work (docs/design/12-api.md 12.3).
   */
  async saveBlocks(
    siteId: string,
    contentId: string,
    input: SaveContentBlocksInput,
  ): Promise<SaveContentBlocksResult> {
    return this.db.forSite(siteId, async (tx) => {
      const current = await tx.content.findUnique({
        where: { id: contentId },
        select: { revision: true },
      });
      if (!current) throw ApiException.notFound('ไม่พบหน้านี้');

      if (current.revision !== input.baseRevision) {
        throw ApiException.conflict('มีคนอื่นแก้หน้านี้ไปแล้ว');
      }

      const updated = await tx.content.update({
        where: { id: contentId },
        data: { blocksDraft: asJson(input.blocks), revision: current.revision + 1 },
        select: { revision: true, updatedAt: true },
      });

      return { revision: updated.revision, savedAt: updated.updatedAt.toISOString() };
    });
  }

  async publish(siteId: string, contentId: string, actorId: string): Promise<PublishResult> {
    const { result, type, slug, locale } = await this.db.forSite(siteId, async (tx) => {
      const current = await tx.content.findUnique({ where: { id: contentId } });
      if (!current) throw ApiException.notFound('ไม่พบหน้านี้');

      const publishedAt = new Date();
      await tx.contentVersion.create({
        data: {
          contentId,
          siteId,
          blocks: asJson(current.blocksDraft),
          createdBy: actorId,
          note: 'เผยแพร่',
        },
      });

      const updated = await tx.content.update({
        where: { id: contentId },
        data: {
          status: 'published',
          blocksPublished: asJson(current.blocksDraft),
          publishedAt,
          scheduledAt: null,
        },
        select: { revision: true },
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'content.publish',
          target: contentId,
          meta: { revision: updated.revision },
        },
      });

      return {
        result: { revision: updated.revision, publishedAt: publishedAt.toISOString() },
        type: isContentType(current.type) ? current.type : ('page' as ContentType),
        slug: current.slug,
        locale: current.locale,
      };
    });

    // Queued after the transaction commits, so the renderer never rebuilds
    // from a publish that rolled back (docs/design/10-architecture.md 10.4).
    await this.publishJobs.enqueuePage({ siteId, type, slug, locale });
    return result;
  }

  async listVersions(siteId: string, contentId: string): Promise<ContentVersionSummary[]> {
    const rows = await this.db.forSite(siteId, (tx) =>
      tx.contentVersion.findMany({
        where: { contentId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 50,
        select: { id: true, note: true, createdAt: true, createdBy: true, blocks: true, ...versionInclude },
      }),
    );

    return rows.map(toVersionSummary);
  }

  /** One version with its blocks, so the history panel can preview it. */
  async getVersion(
    siteId: string,
    contentId: string,
    versionId: string,
  ): Promise<ContentVersionDetail> {
    const row = await this.db.forSite(siteId, (tx) =>
      tx.contentVersion.findFirst({
        where: { id: versionId, contentId },
        select: { id: true, note: true, createdAt: true, createdBy: true, blocks: true, ...versionInclude },
      }),
    );
    if (!row) throw ApiException.notFound('ไม่พบเวอร์ชันนี้');

    return { ...toVersionSummary(row), blocks: readBlocks(row.blocks) };
  }

  /** Manual snapshot from the editor, so the user can name a checkpoint. */
  async createVersion(
    siteId: string,
    contentId: string,
    input: CreateContentVersionInput,
    actorId: string,
  ): Promise<ContentVersionSummary> {
    const row = await this.db.forSite(siteId, async (tx) => {
      const current = await tx.content.findUnique({
        where: { id: contentId },
        select: { blocksDraft: true },
      });
      if (!current) throw ApiException.notFound('ไม่พบหน้านี้');

      const created = await tx.contentVersion.create({
        data: {
          contentId,
          siteId,
          blocks: asJson(current.blocksDraft),
          createdBy: actorId,
          note: input.note && input.note.length > 0 ? input.note : 'บันทึกไว้เอง',
        },
        select: { id: true, note: true, createdAt: true, createdBy: true, blocks: true, ...versionInclude },
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'content.version.create',
          target: contentId,
          meta: { versionId: created.id } satisfies Prisma.InputJsonObject,
        },
      });

      return created;
    });

    return toVersionSummary(row);
  }

  async restoreVersion(
    siteId: string,
    contentId: string,
    versionId: string,
    actorId: string,
  ): Promise<SaveContentBlocksResult> {
    return this.db.forSite(siteId, async (tx) => {
      const version = await tx.contentVersion.findFirst({
        where: { id: versionId, contentId },
        select: { id: true, blocks: true },
      });
      if (!version) throw ApiException.notFound('ไม่พบเวอร์ชันนี้');

      const current = await tx.content.findUnique({
        where: { id: contentId },
        select: { revision: true },
      });
      if (!current) throw ApiException.notFound('ไม่พบหน้านี้');

      const updated = await tx.content.update({
        where: { id: contentId },
        data: { blocksDraft: asJson(version.blocks), revision: current.revision + 1 },
        select: { revision: true, updatedAt: true },
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'content.restore',
          target: contentId,
          meta: { versionId },
        },
      });

      return { revision: updated.revision, savedAt: updated.updatedAt.toISOString() };
    });
  }

  /**
   * Brings a page back from the trash. It returns as a draft: the status it had
   * before is not guaranteed to still make sense, and a draft is the safe place
   * to land before publishing again.
   */
  async restore(siteId: string, contentId: string, actorId: string): Promise<ContentDetail> {
    const current = await this.db.forSite(siteId, (tx) =>
      tx.content.findUnique({ where: { id: contentId } }),
    );
    if (!current) throw ApiException.notFound('ไม่พบหน้านี้');
    if (current.status !== 'archived') {
      throw ApiException.conflict('หน้านี้ไม่ได้อยู่ในถังขยะ');
    }
    if (isContentType(current.type) && current.type === 'page') {
      await this.quota.assertCanAddPage(siteId);
    }

    const row = await this.db.forSite(siteId, async (tx) => {
      const updated = await tx.content.update({
        where: { id: contentId },
        data: { status: 'draft', archivedAt: null },
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'content.restore',
          target: contentId,
          meta: { from: 'trash' } satisfies Prisma.InputJsonObject,
        },
      });

      return updated;
    });

    return toDetail(row);
  }

  /**
   * Deletes every page that has been in the trash longer than the retention
   * window (docs/design/05-admin-ia.md 5.1). `sites` and `users` are outside RLS,
   * so the job lists sites first and then purges one site at a time.
   */
  async purgeExpiredTrash(now: Date = new Date()): Promise<TrashPurgeSummary> {
    const cutoff = new Date(now.getTime() - CONTENT_TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const sites = await this.db.site.findMany({ select: { id: true } });

    let purged = 0;
    for (const site of sites) {
      purged += await this.db.forSite(site.id, async (tx) => {
        const expired = await tx.content.findMany({
          where: { status: 'archived', archivedAt: { lt: cutoff } },
          select: { id: true, title: true, slug: true, type: true },
        });
        if (expired.length === 0) return 0;

        await tx.content.deleteMany({ where: { id: { in: expired.map((row) => row.id) } } });
        await tx.auditLog.createMany({
          data: expired.map((row) => ({
            siteId: site.id,
            userId: null,
            action: 'content.purge',
            target: row.id,
            meta: { title: row.title, slug: row.slug, type: row.type } as Prisma.InputJsonObject,
          })),
        });

        return expired.length;
      });
    }

    return { sites: sites.length, purged };
  }

  /**
   * Every language of one page (docs/design/17-i18n.md 17.3). The admin shows this
   * as the language switcher: which languages already exist and their publish state.
   */
  async translations(siteId: string, contentId: string): Promise<ContentTranslations> {
    const { groupId, defaultLocale, locales, rows } = await this.db.forSite(
      siteId,
      async (tx) => {
        const current = await tx.content.findUnique({
          where: { id: contentId },
          select: { id: true, translationGroupId: true },
        });
        if (!current) throw ApiException.notFound('ไม่พบหน้านี้');

        const groupId = current.translationGroupId ?? current.id;
        const site = await tx.site.findUnique({
          where: { id: siteId },
          select: { locales: true, localeDefault: true },
        });
        const siblings = await tx.content.findMany({
          where: { OR: [{ id: groupId }, { translationGroupId: groupId }] },
          select: { id: true, locale: true, title: true, slug: true, status: true },
          orderBy: { locale: 'asc' },
        });

        return {
          groupId,
          defaultLocale: site?.localeDefault ?? DEFAULT_LOCALE,
          locales: site?.locales ?? [DEFAULT_LOCALE],
          rows: siblings,
        };
      },
    );

    const found: Omit<ContentTranslationLink, 'exists'>[] = rows.map((row) => ({
      locale: row.locale,
      contentId: row.id,
      title: row.title,
      slug: row.slug,
      status: isContentStatus(row.status) ? row.status : 'draft',
    }));

    return translationCoverage(groupId, locales, found, defaultLocale);
  }

  /**
   * Creates a page in another language from an existing one: the block structure
   * is copied, and the copy can be translated with the assistant. It always lands
   * as a draft, so a machine translation is reviewed before it goes live
   * (docs/design/17-i18n.md 17.1).
   */
  async createTranslation(
    siteId: string,
    contentId: string,
    input: CreateTranslationInput,
    actorId: string,
  ): Promise<ContentDetail> {
    const { source, site } = await this.db.forSite(siteId, async (tx) => {
      const row = await tx.content.findUnique({ where: { id: contentId } });
      if (!row) throw ApiException.notFound('ไม่พบหน้านี้');
      const siteRow = await tx.site.findUnique({
        where: { id: siteId },
        select: { locales: true },
      });
      return { source: row, site: siteRow };
    });

    const targetLocale = input.locale;
    if (source.locale === targetLocale) {
      throw ApiException.conflict('หน้านี้เป็นภาษานี้อยู่แล้ว');
    }

    if (site && !site.locales.includes(targetLocale)) {
      throw ApiException.validation('เว็บนี้ยังไม่ได้เปิดใช้ภาษานี้ เพิ่มได้ที่ตั้งค่า › ภาษา');
    }

    const slug = input.slug ?? source.slug;
    await this.assertSlugFree(siteId, {
      type: isContentType(source.type) ? source.type : 'page',
      locale: targetLocale,
      slug,
    });

    // Copy the structure first (with fresh block ids), then optionally translate
    // the copy. The source tree itself is never touched.
    let blocks = cloneBlockTree(readBlocks(source.blocksDraft));
    if (input.translate && blocks.length > 0) {
      blocks = await this.translateBlocks(siteId, actorId, blocks, targetLocale);
    }

    if (isContentType(source.type) && source.type === 'page') {
      await this.quota.assertCanAddPage(siteId);
    }

    const groupId = source.translationGroupId ?? source.id;

    try {
      const row = await this.db.forSite(siteId, (tx) =>
        tx.content.create({
          data: {
            siteId,
            type: source.type,
            title: input.title ?? source.title,
            slug,
            locale: targetLocale,
            translationGroupId: groupId,
            excerpt: source.excerpt,
            blocksDraft: asJson(blocks),
            seo: asJson(readSeo(source.seo)),
            authorId: actorId,
            revision: 1,
          },
        }),
      );

      // Make the original join the group too, so the pair shares one id from now on.
      if (!source.translationGroupId) {
        await this.db.forSite(siteId, (tx) =>
          tx.content.update({
            where: { id: source.id },
            data: { translationGroupId: groupId },
          }),
        );
      }

      await this.audit.log({
        siteId,
        userId: actorId,
        action: 'content.translate',
        target: row.id,
        meta: { sourceId: source.id, locale: targetLocale, translated: input.translate },
      });

      return toDetail(row);
    } catch (error) {
      if (isUniqueViolation(error)) throw ApiException.conflict('ชื่อลิงก์นี้ถูกใช้แล้ว');
      throw error;
    }
  }

  /**
   * Translates the copy of an existing page into its own language
   * (docs/design/17-i18n.md 17.4). Texts that already differ from the source
   * language count as translated, so pressing the button again only fills the
   * remaining gaps. Nothing is written here: the translated tree comes back for
   * the editor to apply and autosave, so a single undo reverts the whole thing.
   */
  async translateContent(
    siteId: string,
    contentId: string,
    input: TranslateContentInput,
    actorId: string,
  ): Promise<TranslateContentResult> {
    const { row, defaultLocale } = await this.db.forSite(siteId, async (tx) => {
      const found = await tx.content.findUnique({ where: { id: contentId } });
      if (!found) throw ApiException.notFound('ไม่พบหน้านี้');
      const site = await tx.site.findUnique({
        where: { id: siteId },
        select: { localeDefault: true },
      });
      return { row: found, defaultLocale: site?.localeDefault ?? DEFAULT_LOCALE };
    });

    const blocks = readBlocks(row.blocksDraft);
    if (row.locale === defaultLocale) {
      throw ApiException.conflict('หน้านี้เป็นภาษาหลักอยู่แล้ว ไม่ต้องแปล');
    }
    if (!(AI_LOCALES as readonly string[]).includes(row.locale)) {
      throw ApiException.validation(`ยังแปลเป็นภาษานี้ไม่ได้ (รองรับ ${AI_LOCALES.join(', ')})`);
    }

    const current = collectBlockTexts(blocks);
    let source: TranslatableText[] = [];
    if (input.onlyMissing) {
      const groupId = row.translationGroupId ?? row.id;
      const sourceRow = await this.db.forSite(siteId, (tx) =>
        tx.content.findFirst({
          where: {
            locale: defaultLocale,
            OR: [{ id: groupId }, { translationGroupId: groupId }],
          },
          select: { blocksDraft: true },
        }),
      );
      if (sourceRow) source = collectBlockTexts(readBlocks(sourceRow.blocksDraft));
    }

    const indexes = input.onlyMissing
      ? missingTranslationIndexes(current, source)
      : current.map((_, index) => index);

    if (indexes.length === 0) {
      return { translatedCount: 0, totalCount: current.length, blocks };
    }

    const translated = await this.ai.translateTexts(
      siteId,
      actorId,
      indexes.map((index) => current[index]?.text ?? ''),
      row.locale as (typeof AI_LOCALES)[number],
    );

    const replacements = new Map<number, string>();
    indexes.forEach((index, position) => {
      const value = translated[position];
      if (typeof value === 'string' && value.length > 0) replacements.set(index, value);
    });

    let cursor = 0;
    const next = mapBlockTexts(blocks, (text) => replacements.get(cursor++) ?? text);

    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'content.translate-texts',
      target: contentId,
      meta: { locale: row.locale, translated: replacements.size, total: current.length },
    });

    return { translatedCount: replacements.size, totalCount: current.length, blocks: next };
  }

  /** Asks the assistant to translate a page's copy, keeping the block structure. */
  private async translateBlocks(
    siteId: string,
    actorId: string,
    blocks: BlockNode[],
    targetLocale: string,
  ): Promise<BlockNode[]> {
    if (!(AI_LOCALES as readonly string[]).includes(targetLocale)) {
      throw ApiException.validation(
        `ยังแปลเป็นภาษานี้ไม่ได้ (รองรับ ${AI_LOCALES.join(', ')})`,
      );
    }

    const texts = collectBlockTexts(blocks).map((entry) => entry.text);
    if (texts.length === 0) return blocks;

    const translated = await this.ai.translateTexts(
      siteId,
      actorId,
      texts,
      targetLocale as (typeof AI_LOCALES)[number],
    );
    return applyBlockTranslations(blocks, translated);
  }

  private async assertSlugFree(
    siteId: string,
    key: { type: ContentType; locale: string; slug: string },
    exceptId?: string,
  ): Promise<void> {
    const taken = await this.db.forSite(siteId, (tx) =>
      tx.content.findFirst({
        where: {
          type: key.type,
          locale: key.locale,
          slug: key.slug,
          ...(exceptId ? { id: { not: exceptId } } : {}),
        },
        select: { id: true },
      }),
    );
    if (taken) throw ApiException.conflict('ชื่อลิงก์นี้ถูกใช้แล้ว');
  }
}

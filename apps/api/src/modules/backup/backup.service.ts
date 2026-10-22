import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, SiteBackup } from '@prisma/client';
import {
  backupFilename,
  blockTreeSchema,
  readBackupSchedule,
  isRole,
  SITE_EXPORT_VERSION,
  type BackupOverview,
  type BackupScheduleInput,
  type BackupSnapshot,
  type BlockTree,
  type SiteExport,
  type SiteExportFile,
  type SiteImportInput,
  type SiteImportResult,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { AuditService } from '../audit/audit.service';
import { MediaService } from '../media/media.service';
import { MEDIA_STORAGE, type MediaStorage } from '../media/media.storage';
import { PrismaService } from '../prisma/prisma.service';
import { backupMediaFileMaxBytes, backupMediaMaxBytes } from './backup.config';

const asJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;
const asJsonArray = (value: unknown): Prisma.InputJsonValue =>
  (Array.isArray(value) ? value : []) as Prisma.InputJsonValue;

/**
 * Reads stored blocks defensively, the same way the editor does: a block tree
 * that no longer matches the schema must not break the backup, so it falls back
 * to an empty tree instead of throwing.
 */
const readBlocks = (value: unknown): BlockTree => {
  const parsed = blockTreeSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
};

/** Published blocks keep `null` when the page has never been published. */
const readPublishedBlocks = (value: unknown): BlockTree | null => {
  if (value === null || value === undefined) return null;
  const parsed = blockTreeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};


const toSnapshot = (row: SiteBackup): BackupSnapshot => ({
  id: row.id,
  filename: row.filename,
  sizeBytes: row.sizeBytes,
  kind: row.kind === 'manual' ? 'manual' : 'auto',
  createdAt: row.createdAt.toISOString(),
});

/**
 * Whole-site backup (docs/design/05-admin-ia.md "ตั้งค่า › Backup & ประวัติเวอร์ชัน",
 * 15-security.md). The export is a portable JSON file; the import merges it back
 * into the same site without touching rows that already exist, so a restore never
 * overwrites newer work.
 */
@Injectable()
export class BackupService {
  constructor(
    private readonly db: PrismaService,
    @Inject(MEDIA_STORAGE) private readonly storage: MediaStorage,
    private readonly media: MediaService,
    private readonly audit: AuditService,
  ) {}

  async exportSite(siteId: string, options: { mediaFiles?: boolean } = {}): Promise<SiteExportFile> {
    const payload = await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({ where: { id: siteId } });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');

      const [
        contents,
        menus,
        globalBlocks,
        sectionTemplates,
        forms,
        subscribers,
        domainRows,
        memberRows,
        mediaRows,
        productRows,
        orderRows,
      ] = await Promise.all([
          tx.content.findMany({ orderBy: [{ type: 'asc' }, { slug: 'asc' }] }),
          tx.menu.findMany({ orderBy: { location: 'asc' } }),
          tx.globalBlock.findMany({ orderBy: { createdAt: 'asc' } }),
          tx.sectionTemplate.findMany({ orderBy: { createdAt: 'asc' } }),
          tx.form.findMany({ orderBy: { createdAt: 'asc' } }),
          tx.subscriber.findMany({ orderBy: { createdAt: 'asc' } }),
          tx.domain.findMany({ orderBy: [{ isPrimary: 'desc' }, { hostname: 'asc' }] }),
          tx.siteMember.findMany({
            include: { user: { select: { email: true } } },
            orderBy: [{ createdAt: 'asc' }, { userId: 'asc' }],
          }),
          tx.media.findMany({
            where: { status: { not: 'trashed' } },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          }),
          tx.product.findMany({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }),
          tx.order.findMany({
            include: { items: true },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          }),
        ]);

      // Metadata always travels; the bytes are attached after the transaction,
      // so a large library never keeps a database connection open.
      const media: NonNullable<SiteExport['media']> = mediaRows.map((row) => {
        const focal = row.focalPoint as { x?: unknown; y?: unknown } | null;
        return {
          filename: row.filename ?? 'media',
          mime: row.mime ?? 'image/jpeg',
          sizeBytes: Number(row.sizeBytes ?? 0),
          width: row.width,
          height: row.height,
          alt: row.alt,
          folder: row.folder,
          focalPoint:
            focal && typeof focal.x === 'number' && typeof focal.y === 'number'
              ? { x: focal.x, y: focal.y }
              : null,
          files: [],
        };
      });

      const mediaNameById = new Map(
        mediaRows.map((row) => [row.id, row.filename ?? row.id]),
      );
      const imagesOf = (value: unknown): string[] =>
        (Array.isArray(value) ? value : [])
          .map((id) => (typeof id === 'string' ? mediaNameById.get(id) : undefined))
          .filter((name): name is string => typeof name === 'string');

      const exportPayload: SiteExport = {
        version: SITE_EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        site: {
          name: site.name,
          subdomain: site.subdomain,
          localeDefault: site.localeDefault,
          locales: site.locales,
          plan: site.plan,
          themeTokens: (site.themeTokens ?? {}) as Record<string, unknown>,
          settings: (site.settings ?? {}) as Record<string, unknown>,
        },
        contents: contents.map((content) => ({
          type: content.type as SiteExport['contents'][number]['type'],
          title: content.title,
          slug: content.slug,
          locale: content.locale,
          status: content.status as SiteExport['contents'][number]['status'],
          blocksDraft: readBlocks(content.blocksDraft),
          blocksPublished: readPublishedBlocks(content.blocksPublished),
          excerpt: content.excerpt,
          seo: (content.seo ?? {}) as SiteExport['contents'][number]['seo'],
          publishedAt: content.publishedAt ? content.publishedAt.toISOString() : null,
        })),
        menus: menus.map((menu) => ({
          location: menu.location,
          items: Array.isArray(menu.items) ? (menu.items as unknown[]) : [],
        })),
        globalBlocks: globalBlocks.map((block) => ({
          name: block.name,
          kind: block.kind,
          blocks: readBlocks(block.blocks),
        })),
        sectionTemplates: sectionTemplates.map((template) => ({
          name: template.name,
          blocks: readBlocks(template.blocks),
        })),
        forms: forms.map((form) => ({
          name: form.name,
          fields: Array.isArray(form.fields) ? (form.fields as unknown[]) : [],
          notify: (form.notify ?? {}) as Record<string, unknown>,
          successMessage: form.successMessage,
        })),
        subscribers: subscribers.map((subscriber) => ({
          email: subscriber.email,
          status: subscriber.status === 'unsubscribed' ? 'unsubscribed' : 'active',
        })),
        domains: domainRows.map((domain) => ({
          hostname: domain.hostname,
          isPrimary: domain.isPrimary,
        })),
        members: memberRows.map((member) => ({
          email: member.user.email,
          role: isRole(member.role) ? member.role : 'viewer',
        })),
        products: productRows.map((product) => ({
          title: product.title,
          slug: product.slug,
          description: product.description,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          stock: product.stock,
          category: product.category,
          status:
            product.status === 'active' || product.status === 'archived'
              ? product.status
              : 'draft',
          images: imagesOf(product.images),
        })),
        orders: orderRows.map((order) => ({
          number: order.number,
          status:
            order.status === 'paid' ||
            order.status === 'shipped' ||
            order.status === 'completed' ||
            order.status === 'cancelled'
              ? order.status
              : 'pending',
          paymentMethod: order.paymentMethod === 'cod' ? 'cod' : 'promptpay',
          customer: (order.customer ?? {}) as Record<string, unknown>,
          note: order.note,
          subtotal: order.subtotal,
          shippingFee: order.shippingFee,
          total: order.total,
          trackingNumber: order.trackingNumber,
          paidAt: order.paidAt ? order.paidAt.toISOString() : null,
          createdAt: order.createdAt.toISOString(),
          items: order.items.map((item) => ({
            title: item.title,
            price: item.price,
            quantity: item.quantity,
          })),
        })),
        media,
      };

      return { payload: exportPayload, subdomain: site.subdomain, mediaRows };
    });

    // Attach original bytes while they fit the backup budget; anything larger
    // stays metadata-only and is reported as skipped on import.
    let mediaBudget = backupMediaMaxBytes();
    const perFileLimit = backupMediaFileMaxBytes();
    const mediaEntries = options.mediaFiles === false ? [] : (payload.payload.media ?? []);
    for (let index = 0; index < payload.mediaRows.length; index += 1) {
      const row = payload.mediaRows[index];
      const entry = mediaEntries[index];
      if (!row || !entry) continue;

      const size = Number(row.sizeBytes ?? 0);
      if (size <= 0 || size > perFileLimit || size > mediaBudget) continue;

      const bytes = await this.storage.read(row.storageKey);
      if (!bytes || bytes.length === 0 || bytes.length > mediaBudget) continue;

      entry.files = [
        {
          name: 'original',
          mime: row.mime ?? 'application/octet-stream',
          base64: bytes.toString('base64'),
        },
      ];
      mediaBudget -= bytes.length;
    }

    return {
      filename: backupFilename(payload.subdomain),
      content: JSON.stringify(payload.payload, null, 2),
    };
  }

  async importSite(
    siteId: string,
    input: SiteImportInput,
    actorId: string,
  ): Promise<SiteImportResult> {
    // Files go through MediaService (checks, storage, queue) before the rows are
    // merged, so a failed image never rolls back the rest of the restore.
    const media = await this.importMediaFiles(siteId, input, actorId);

    // Domains live outside the site transaction: the hostname is unique across
    // the whole platform, so a domain owned by another site must be skipped
    // instead of failing the restore on a constraint.
    const requestedDomains = input.domains;
    const takenHostnames = new Set(
      requestedDomains.length === 0
        ? []
        : (
            await this.db.domain.findMany({
              where: { hostname: { in: requestedDomains.map((domain) => domain.hostname) } },
              select: { hostname: true },
            })
          ).map((row) => row.hostname),
    );

    // Memberships need an existing account; owners are already on the site.
    const memberEmails = [
      ...new Set(
        input.members
          .filter((member) => member.role !== 'owner')
          .map((member) => member.email.toLowerCase()),
      ),
    ];
    const memberUsers =
      memberEmails.length === 0
        ? []
        : await this.db.user.findMany({
            where: { email: { in: memberEmails } },
            select: { id: true, email: true },
          });
    const userByEmail = new Map(memberUsers.map((user) => [user.email.toLowerCase(), user.id]));

    const result = await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({ where: { id: siteId }, select: { id: true } });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');

      let contentsAdded = 0;
      let contentsSkipped = 0;
      for (const content of input.contents) {
        const existing = await tx.content.findUnique({
          where: {
            siteId_locale_type_slug: {
              siteId,
              locale: content.locale,
              type: content.type,
              slug: content.slug,
            },
          },
          select: { id: true },
        });
        if (existing) {
          contentsSkipped += 1;
          continue;
        }

        await tx.content.create({
          data: {
            siteId,
            type: content.type,
            title: content.title,
            slug: content.slug,
            locale: content.locale,
            status: content.status,
            blocksDraft: asJsonArray(content.blocksDraft),
            blocksPublished: content.blocksPublished ? asJsonArray(content.blocksPublished) : undefined,
            excerpt: content.excerpt,
            seo: asJson(content.seo),
            publishedAt: content.publishedAt ? new Date(content.publishedAt) : null,
          },
        });
        contentsAdded += 1;
      }

      for (const menu of input.menus) {
        // Menus are keyed by (site, location, locale); an imported menu without a
        // language is the one shared by every language (docs/design/17-i18n.md 17.5).
        const locale = menu.locale ?? null;
        const existing = await tx.menu.findFirst({
          where: { siteId, location: menu.location, locale },
        });
        if (existing) {
          await tx.menu.update({ where: { id: existing.id }, data: { items: asJsonArray(menu.items) } });
        } else {
          await tx.menu.create({
            data: { siteId, location: menu.location, locale, items: asJsonArray(menu.items) },
          });
        }
      }

      let domainsAdded = 0;
      const newDomains = requestedDomains.filter((domain) => !takenHostnames.has(domain.hostname));
      if (newDomains.length > 0) {
        if (newDomains.some((domain) => domain.isPrimary)) {
          await tx.domain.updateMany({ where: { siteId, isPrimary: true }, data: { isPrimary: false } });
        }
        const created = await tx.domain.createMany({
          data: newDomains.map((domain) => ({
            siteId,
            hostname: domain.hostname,
            isPrimary: domain.isPrimary,
          })),
          skipDuplicates: true,
        });
        domainsAdded = created.count;
      }
      const domainsSkipped = requestedDomains.length - domainsAdded;

      for (const block of input.globalBlocks) {
        // One global block per kind: a restore updates the existing header/footer
        // instead of stacking a second copy next to it.
        const existing = block.kind
          ? await tx.globalBlock.findFirst({
              where: { siteId, kind: block.kind },
              select: { id: true },
            })
          : null;
        if (existing) {
          await tx.globalBlock.update({
            where: { id: existing.id },
            data: {
              blocks: asJsonArray(block.blocks),
              ...(block.name ? { name: block.name } : {}),
            },
          });
        } else {
          await tx.globalBlock.create({
            data: { siteId, name: block.name, kind: block.kind, blocks: asJsonArray(block.blocks) },
          });
        }
      }

      for (const template of input.sectionTemplates) {
        await tx.sectionTemplate.create({
          data: { siteId, name: template.name, blocks: asJsonArray(template.blocks), createdBy: actorId },
        });
      }

      for (const form of input.forms) {
        await tx.form.create({
          data: {
            siteId,
            name: form.name,
            fields: asJsonArray(form.fields),
            notify: asJson(form.notify),
            successMessage: form.successMessage,
          },
        });
      }

      let subscribersAdded = 0;
      if (input.subscribers.length > 0) {
        const created = await tx.subscriber.createMany({
          data: input.subscribers.map((subscriber) => ({
            siteId,
            email: subscriber.email,
            status: subscriber.status,
          })),
          skipDuplicates: true,
        });
        subscribersAdded = created.count;
      }

      let membersAdded = 0;
      for (const member of input.members) {
        if (member.role === 'owner') continue;
        const userId = userByEmail.get(member.email.toLowerCase());
        if (!userId) continue;

        const existing = await tx.siteMember.findUnique({
          where: { siteId_userId: { siteId, userId } },
          select: { userId: true },
        });
        if (existing) continue;

        await tx.siteMember.create({ data: { siteId, userId, role: member.role } });
        membersAdded += 1;
      }
      const membersSkipped = input.members.length - membersAdded;

      let productsAdded = 0;
      let productsSkipped = 0;
      for (const product of input.products) {
        const existing = await tx.product.findFirst({
          where: { slug: product.slug },
          select: { id: true },
        });
        if (existing) {
          productsSkipped += 1;
          continue;
        }

        await tx.product.create({
          data: {
            siteId,
            title: product.title,
            slug: product.slug,
            description: product.description,
            price: product.price,
            compareAtPrice: product.compareAtPrice,
            images: asJsonArray(
              product.images
                .map((filename) => media.idsByFilename.get(filename))
                .filter((id): id is string => typeof id === 'string'),
            ),
            stock: product.stock,
            category: product.category,
            status: product.status,
          },
        });
        productsAdded += 1;
      }

      const importedProducts = await tx.product.findMany({
        select: { id: true, title: true },
      });
      const productByTitle = new Map(importedProducts.map((row) => [row.title, row.id]));

      let ordersAdded = 0;
      let ordersSkipped = 0;
      for (const order of input.orders) {
        const existing = await tx.order.findFirst({
          where: { number: order.number },
          select: { id: true },
        });
        if (existing) {
          ordersSkipped += 1;
          continue;
        }

        await tx.order.create({
          data: {
            siteId,
            number: order.number,
            token: randomBytes(18).toString('hex'),
            status: order.status,
            paymentMethod: order.paymentMethod,
            customer: asJson(order.customer),
            note: order.note,
            subtotal: order.subtotal,
            shippingFee: order.shippingFee,
            total: order.total,
            trackingNumber: order.trackingNumber,
            paidAt: order.paidAt ? new Date(order.paidAt) : null,
            createdAt: new Date(order.createdAt),
            items: {
              create: order.items.map((item) => ({
                siteId,
                productId: productByTitle.get(item.title) ?? null,
                title: item.title,
                price: item.price,
                quantity: item.quantity,
              })),
            },
          },
        });
        ordersAdded += 1;
      }

      const result: SiteImportResult = {
        contents: { added: contentsAdded, skipped: contentsSkipped },
        menus: input.menus.length,
        globalBlocks: input.globalBlocks.length,
        sectionTemplates: input.sectionTemplates.length,
        forms: input.forms.length,
        subscribers: { added: subscribersAdded, skipped: input.subscribers.length - subscribersAdded },
        domains: { added: domainsAdded, skipped: domainsSkipped },
        members: { added: membersAdded, skipped: membersSkipped },
        products: { added: productsAdded, skipped: productsSkipped },
        orders: { added: ordersAdded, skipped: ordersSkipped },
        media: { added: media.added, skipped: media.skipped },
      };

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'site.import',
          target: siteId,
          meta: {
            contents: result.contents,
            menus: result.menus,
            forms: result.forms,
            subscribers: result.subscribers,
            domains: result.domains,
            members: result.members,
            products: result.products,
            orders: result.orders,
            media: result.media,
          } as Prisma.InputJsonValue,
        },
      });

      return result;
    });

    return result;
  }

  /**
   * Restores the original bytes of backed-up images. Each file is independent:
   * a corrupt or oversized image is skipped and counted, and the rest of the
   * backup still imports.
   */

  /** Schedule, snapshots and the last run, for ตั้งค่า › Backup. */
  async overview(siteId: string): Promise<BackupOverview> {
    const { settings, rows } = await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({
        where: { id: siteId },
        select: { settings: true },
      });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
      const snapshots = await tx.siteBackup.findMany({
        where: { siteId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      return { settings: site.settings, rows: snapshots };
    });

    return {
      schedule: {
        ...readBackupSchedule(settings),
        lastRunAt: rows[0]?.createdAt.toISOString() ?? null,
      },
      items: rows.map(toSnapshot),
    };
  }

  async updateSchedule(
    siteId: string,
    input: BackupScheduleInput,
    actorId: string,
  ): Promise<BackupOverview> {
    await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({
        where: { id: siteId },
        select: { settings: true },
      });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
      const settings =
        site.settings !== null && typeof site.settings === 'object' && !Array.isArray(site.settings)
          ? (site.settings as Record<string, unknown>)
          : {};
      await tx.site.update({
        where: { id: siteId },
        data: { settings: asJson({ ...settings, backup: input }) },
      });
    });

    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'backup.schedule.update',
      target: siteId,
      meta: input,
    });

    return this.overview(siteId);
  }

  /** Takes a snapshot now, from either the worker or the "back up now" button. */
  async snapshot(
    siteId: string,
    kind: 'auto' | 'manual',
    actorId: string | null,
  ): Promise<BackupSnapshot> {
    const file = await this.exportSite(siteId, { mediaFiles: false });
    const created = await this.db.forSite(siteId, (tx) =>
      tx.siteBackup.create({
        data: {
          siteId,
          filename: file.filename,
          sizeBytes: Buffer.byteLength(file.content, 'utf8'),
          payload: JSON.parse(file.content) as Prisma.InputJsonValue,
          kind,
          createdBy: actorId,
        },
      }),
    );

    if (actorId) {
      await this.audit.log({
        siteId,
        userId: actorId,
        action: 'backup.snapshot.create',
        target: created.id,
        meta: { kind, sizeBytes: created.sizeBytes },
      });
    }

    return toSnapshot(created);
  }

  async snapshotFile(siteId: string, snapshotId: string): Promise<SiteExportFile> {
    const row = await this.db.forSite(siteId, (tx) =>
      tx.siteBackup.findFirst({ where: { id: snapshotId, siteId } }),
    );
    if (!row) throw ApiException.notFound('ไม่พบไฟล์สำรองนี้');
    return { filename: row.filename, content: JSON.stringify(row.payload, null, 2) };
  }

  /** Deletes snapshots older than the site's retention window. */
  async purgeOld(siteId: string, retentionDays: number): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = await this.db.forSite(siteId, (tx) =>
      tx.siteBackup.deleteMany({ where: { siteId, createdAt: { lt: cutoff } } }),
    );
    return result.count;
  }

  private async importMediaFiles(
    siteId: string,
    input: SiteImportInput,
    actorId: string,
  ): Promise<{ added: number; skipped: number; idsByFilename: Map<string, string> }> {
    const entries = input.media ?? [];
    let added = 0;
    let skipped = 0;
    const idsByFilename = new Map<string, string>();

    for (const entry of entries) {
      const file = entry.files.find((candidate) => candidate.name === 'original') ?? entry.files[0];
      if (!file) {
        skipped += 1;
        continue;
      }

      try {
        const item = await this.media.importFile(
          siteId,
          {
            filename: entry.filename,
            mime: file.mime || entry.mime,
            data: Buffer.from(file.base64, 'base64'),
            width: entry.width,
            height: entry.height,
            alt: entry.alt,
            folder: entry.folder,
            focalPoint: entry.focalPoint ?? null,
          },
          actorId,
        );
        added += 1;
        idsByFilename.set(entry.filename, item.id);
      } catch {
        skipped += 1;
      }
    }

    return { added, skipped, idsByFilename };
  }
}

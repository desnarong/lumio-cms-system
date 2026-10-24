import { Injectable } from '@nestjs/common';
import {
  menuAlignFromSettings,
  parseMenuItems,
  type MenuDetail,
  type MenuLocation,
  type UpdateMenuInput,
} from '@lumio/shared';
import { Prisma } from '@prisma/client';
import { ApiException } from '../../common/api-error';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublishService } from '../publish/publish.service';

const asJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const readItems = (value: unknown): MenuDetail['items'] => parseMenuItems(value);

/**
 * Navigation menus (docs/design/08-theme-design-panel.md 8.4). Items may point
 * at a page of the site (`contentId`) or at an external URL; the template pack
 * fills them with the sample pages it creates.
 *
 * A menu belongs to one language, or to every language when its `locale` is
 * null (docs/design/17-i18n.md 17.5). An omitted `locale` in a request means the
 * shared menu, so a single-language site never has to think about it.
 */
@Injectable()
export class MenusService {
  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
    private readonly publish?: PublishService,
  ) {}

  async get(siteId: string, location: MenuLocation, locale?: string): Promise<MenuDetail> {
    const wanted = locale?.trim().toLowerCase() || null;

    const { row, align } = await this.db.forSite(siteId, async (tx) => {
      const [menu, site] = await Promise.all([
        tx.menu.findFirst({
          where: { location, locale: wanted },
          select: { items: true, locale: true, updatedAt: true },
        }),
        tx.site.findUnique({ where: { id: siteId }, select: { settings: true } }),
      ]);
      return { row: menu, align: menuAlignFromSettings(site?.settings, location) };
    });

    if (!row) {
      return {
        location,
        items: [],
        locale: wanted,
        align,
        updatedAt: new Date(0).toISOString(),
      };
    }
    return {
      location,
      items: readItems(row.items),
      locale: row.locale,
      align,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async update(
    siteId: string,
    location: MenuLocation,
    input: UpdateMenuInput,
    actorId: string,
  ): Promise<MenuDetail> {
    const wanted = input.locale?.trim().toLowerCase() || null;

    const { row, align } = await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({
        where: { id: siteId },
        select: { settings: true },
      });
      const settings = asRecord(site?.settings);
      let nextAlign = menuAlignFromSettings(settings, location);

      if (input.align) {
        nextAlign = input.align;
        const current = asRecord(settings.menuAlign);
        await tx.site.update({
          where: { id: siteId },
          data: {
            settings: asJson({
              ...settings,
              menuAlign: { ...current, [location]: nextAlign },
            }),
          },
        });
      }

      const existing = await tx.menu.findFirst({ where: { location, locale: wanted } });
      const saved = existing
        ? await tx.menu.update({
            where: { id: existing.id },
            data: { items: asJson(input.items) },
            select: { items: true, locale: true, updatedAt: true },
          })
        : await tx.menu.create({
            data: { siteId, location, locale: wanted, items: asJson(input.items) },
            select: { items: true, locale: true, updatedAt: true },
          });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'menu.update',
          target: wanted ? `${location}:${wanted}` : location,
          meta: { items: input.items.length, align: nextAlign } as Prisma.InputJsonObject,
        },
      });

      return { row: saved, align: nextAlign };
    });

    await this.publish?.enqueueChrome(siteId);
    return {
      location,
      items: readItems(row.items),
      locale: row.locale,
      align,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** Reserved for the Design screen: the site must exist before editing menus. */
  async assertSiteExists(siteId: string): Promise<void> {
    const site = await this.db.site.findUnique({ where: { id: siteId }, select: { id: true } });
    if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
  }
}
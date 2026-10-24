import { Injectable } from '@nestjs/common';
import {
  DEFAULT_THEME_TOKENS,
  applyThemeTokensPatch,
  normalizeThemeTokens,
  siteChromeSchema,
  type ApplyTemplateInput,
  type DesignTemplateResult,
  type DesignTokens,
  type SiteChrome,
  type SiteChromePatch,
  type ThemeTokensPatch,
} from '@lumio/shared';
import { Prisma } from '@prisma/client';
import { ApiException } from '../../common/api-error';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublishService } from '../publish/publish.service';
import { TemplateApplyService } from '../templates/template-apply.service';
import { TemplatesService } from '../templates/templates.service';

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

/**
 * Design tokens and template switching (docs/design/08-theme-design-panel.md).
 * Changing either one is presentation only: `contents.blocks_*` is never touched,
 * so an owner can restyle the whole site without losing a word.
 */
@Injectable()
export class DesignService {
  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
    private readonly templates: TemplatesService,
    private readonly apply: TemplateApplyService,
    private readonly publish?: PublishService,
  ) {}

  async getTokens(siteId: string): Promise<DesignTokens> {
    const site = await this.db.forSite(siteId, (tx) =>
      tx.site.findUnique({
        where: { id: siteId },
        select: { themeTokens: true, templateId: true, settings: true },
      }),
    );
    if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');

    const settings = asRecord(site.settings);
    return {
      tokens: normalizeThemeTokens(site.themeTokens),
      templateId: site.templateId,
      styleId: typeof settings.styleId === 'string' ? settings.styleId : null,
    };
  }

  async updateTokens(
    siteId: string,
    patch: ThemeTokensPatch,
    actorId: string,
  ): Promise<DesignTokens> {
    const result = await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({
        where: { id: siteId },
        select: { themeTokens: true, templateId: true, settings: true },
      });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');

      const tokens = applyThemeTokensPatch(site.themeTokens, patch);
      const updated = await tx.site.update({
        where: { id: siteId },
        data: { themeTokens: asJson(tokens) },
        select: { templateId: true, settings: true },
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'design.tokens_update',
          target: siteId,
          meta: { changed: Object.keys(patch).filter((key) => key !== '') } as Prisma.InputJsonObject,
        },
      });

      const settings = asRecord(updated.settings);
      return {
        tokens,
        templateId: updated.templateId,
        styleId: typeof settings.styleId === 'string' ? settings.styleId : null,
      };
    });

    await this.publish?.enqueueChrome(siteId);
    return result;
  }

  /** Header height and other chrome sizes the Design Panel can change. */
  async getChrome(siteId: string): Promise<SiteChrome> {
    const site = await this.db.forSite(siteId, (tx) =>
      tx.site.findUnique({ where: { id: siteId }, select: { settings: true } }),
    );
    if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
    return this.readChrome(site.settings);
  }

  async updateChrome(
    siteId: string,
    patch: SiteChromePatch,
    actorId: string,
  ): Promise<SiteChrome> {
    const result = await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({
        where: { id: siteId },
        select: { settings: true },
      });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');

      const chrome = siteChromeSchema.parse({ ...this.readChrome(site.settings), ...patch });
      const settings = asRecord(site.settings);

      await tx.site.update({
        where: { id: siteId },
        data: { settings: asJson({ ...settings, chrome }) },
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'design.chrome_update',
          target: siteId,
          meta: { changed: Object.keys(patch) } as Prisma.InputJsonObject,
        },
      });

      return chrome;
    });

    await this.publish?.enqueueChrome(siteId);
    return result;
  }

  private readChrome(settings: unknown): SiteChrome {
    const stored = asRecord(asRecord(settings).chrome);
    const parsed = siteChromeSchema.safeParse(stored);
    return parsed.success ? parsed.data : siteChromeSchema.parse({});
  }

  /** Applies another template: new tokens, and optionally new header/footer. */
  async applyTemplate(
    siteId: string,
    templateId: string,
    input: ApplyTemplateInput,
    actorId: string,
  ): Promise<DesignTemplateResult> {
    const pack = this.templates.byId(templateId);

    const result = await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({
        where: { id: siteId },
        select: { settings: true },
      });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');

      const tokens = this.apply.tokensForSite(pack);
      const settings = { ...asRecord(site.settings), styleId: pack.manifest.styleId };

      await tx.site.update({
        where: { id: siteId },
        data: {
          templateId: pack.manifest.id,
          themeTokens: asJson(tokens),
          settings: asJson(settings),
        },
      });

      if (input.applyHeaderFooter) {
        await this.apply.writeGlobalBlocks(tx, siteId, pack);
        await this.apply.writeMenus(tx, siteId, pack);
      }

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'design.template_apply',
          target: siteId,
          meta: {
            templateId: pack.manifest.id,
            template: pack.key,
            headerFooter: input.applyHeaderFooter,
          },
        },
      });

      return {
        tokens,
        templateId: pack.manifest.id,
        styleId: pack.manifest.styleId,
        headerFooterApplied: input.applyHeaderFooter,
      };
    });

    await this.publish?.enqueueChrome(siteId);
    return result;
  }

  /** Puts the current template's colours, fonts and corners back. */
  async resetTokens(siteId: string, actorId: string): Promise<DesignTokens> {
    const result = await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({
        where: { id: siteId },
        select: { templateId: true, settings: true },
      });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');

      const pack = site.templateId ? this.templates.byId(site.templateId) : null;
      const tokens = pack ? this.apply.tokensForSite(pack) : DEFAULT_THEME_TOKENS;

      await tx.site.update({ where: { id: siteId }, data: { themeTokens: asJson(tokens) } });
      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'design.tokens_reset',
          target: siteId,
          meta: { templateId: site.templateId },
        },
      });

      const settings = asRecord(site.settings);
      return {
        tokens,
        templateId: site.templateId,
        styleId: typeof settings.styleId === 'string' ? settings.styleId : null,
      };
    });

    await this.publish?.enqueueChrome(siteId);
    return result;
  }
}
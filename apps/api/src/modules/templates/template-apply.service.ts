import { Injectable } from '@nestjs/common';
import {
  applyThemeStylePreset,
  normalizeThemeTokens,
  publicPathFor,
  withSectionStyles,
  type ThemeTokens,
  type WizardPageSummary,
} from '@lumio/shared';
import { Prisma } from '@prisma/client';
import type { TemplatePack } from './template-store';

export interface SamplePagesResult {
  pages: WizardPageSummary[];
  /** Public paths the renderer has to rebuild after the transaction commits. */
  paths: string[];
}

export interface BrandOverrides {
  styleId?: string;
  primaryColor?: string;
  accentColor?: string;
}

const asJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

const readRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/**
 * Turns a template pack into rows for one site: tokens, header/footer, menus and
 * the sample pages. Every method takes the caller's `forSite` transaction, so the
 * work happens under RLS, and content the user already wrote is never touched
 * (docs/design/08-theme-design-panel.md 8.2).
 */
@Injectable()
export class TemplateApplyService {
  /**
   * Theme a site starts with: the template's own tokens, then the wizard's style
   * card, then the brand colour the owner picked in step 4.
   */
  tokensForSite(pack: TemplatePack, overrides: BrandOverrides = {}): ThemeTokens {
    const styled = applyThemeStylePreset(pack.tokens, overrides.styleId ?? pack.manifest.styleId);
    return normalizeThemeTokens({
      ...styled,
      colors: {
        ...styled.colors,
        ...(overrides.primaryColor ? { primary: overrides.primaryColor } : {}),
        ...(overrides.accentColor ? { accent: overrides.accentColor } : {}),
      },
    });
  }

  /** Header/footer live as global blocks so one edit updates every page. */
  async writeGlobalBlocks(
    tx: Prisma.TransactionClient,
    siteId: string,
    pack: TemplatePack,
  ): Promise<void> {
    await tx.globalBlock.deleteMany({ where: { kind: { in: ['header', 'footer'] } } });

    for (const kind of ['header', 'footer'] as const) {
      const blocks = pack.globalBlocks[kind];
      if (blocks.length === 0) continue;
      await tx.globalBlock.create({
        data: {
          siteId,
          kind,
          name: kind === 'header' ? 'ส่วนหัวเว็บ' : 'ส่วนท้ายเว็บ',
          blocks: asJson(blocks),
        },
      });
    }
  }

  async writeMenus(tx: Prisma.TransactionClient, siteId: string, pack: TemplatePack): Promise<void> {
    for (const location of ['header', 'footer'] as const) {
      const items = pack.menus[location];
      // A pack ships one menu per location; it serves every language until the
      // user adds a language-specific one (docs/design/17-i18n.md 17.5).
      const existing = await tx.menu.findFirst({ where: { siteId, location, locale: null } });
      if (existing) {
        await tx.menu.update({ where: { id: existing.id }, data: { items: asJson(items) } });
      } else {
        await tx.menu.create({ data: { siteId, location, items: asJson(items) } });
      }
    }
  }

  /** The 4-5 sample pages of the pack, with the pack's section styles applied. */
  async createSamplePages(
    tx: Prisma.TransactionClient,
    siteId: string,
    pack: TemplatePack,
    options: { publishNow: boolean; authorId: string; locale: string },
  ): Promise<SamplePagesResult> {
    const pages: WizardPageSummary[] = [];
    const paths: string[] = [];
    const publishedAt = new Date();

    for (const page of pack.pages) {
      const blocks = withSectionStyles(page.blocks, pack.sectionStyles);
      const row = await tx.content.create({
        data: {
          siteId,
          type: page.type,
          title: page.title,
          slug: page.slug,
          locale: options.locale,
          status: options.publishNow ? 'published' : 'draft',
          blocksDraft: asJson(blocks),
          blocksPublished: options.publishNow ? asJson(blocks) : Prisma.JsonNull,
          excerpt: page.excerpt ?? null,
          authorId: options.authorId,
          seo: asJson({
            ...(page.seoDescription ? { description: page.seoDescription } : {}),
            noindex: false,
          }),
          publishedAt: options.publishNow ? publishedAt : null,
          revision: 1,
        },
        select: { id: true, title: true, slug: true, type: true, status: true },
      });

      if (options.publishNow) {
        await tx.contentVersion.create({
          data: {
            contentId: row.id,
            siteId,
            blocks: asJson(blocks),
            createdBy: options.authorId,
            note: 'เนื้อหาจากเทมเพลต',
          },
        });
        paths.push(publicPathFor(page.type, page.slug));
      }

      pages.push({
        id: row.id,
        title: row.title,
        slug: row.slug,
        type: page.type,
        status: row.status,
      });
    }

    return { pages, paths };
  }

  /** Reads the global header/footer back (used by the Design screen). */
  async readPresentation(
    tx: Prisma.TransactionClient,
  ): Promise<{ header: unknown[]; footer: unknown[] }> {
    const rows = await tx.globalBlock.findMany({
      where: { kind: { in: ['header', 'footer'] } },
      select: { kind: true, blocks: true },
    });

    const presentation: { header: unknown[]; footer: unknown[] } = { header: [], footer: [] };
    for (const row of rows) {
      const blocks = Array.isArray(row.blocks) ? row.blocks : [];
      if (row.kind === 'header') presentation.header = blocks;
      if (row.kind === 'footer') presentation.footer = blocks;
    }
    return presentation;
  }

  /** Business type, style id and the logo live together in `sites.settings`. */
  async readSettings(
    tx: Prisma.TransactionClient,
    siteId: string,
  ): Promise<Record<string, unknown>> {
    const site = await tx.site.findUnique({ where: { id: siteId }, select: { settings: true } });
    return readRecord(site?.settings);
  }
}
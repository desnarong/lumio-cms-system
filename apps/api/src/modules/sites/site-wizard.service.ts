import { Injectable } from '@nestjs/common';
import type { CreateSiteFromTemplateInput, WizardSiteResult } from '@lumio/shared';
import { Prisma } from '@prisma/client';
import { ApiException } from '../../common/api-error';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { PublishService } from '../publish/publish.service';
import { TemplateApplyService } from '../templates/template-apply.service';
import { TemplatesService } from '../templates/templates.service';
import { SiteLocaleService } from './site-locale.service';

/**
 * Step 5 of the onboarding wizard: build the site from a template
 * (docs/design/04-ux.md 4.1). The site row, its owner membership, the
 * header/footer global blocks, the menus and the sample pages are written in one
 * site-scoped transaction, and the publish jobs are queued only after it commits.
 */
@Injectable()
export class SiteWizardService {
  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
    private readonly publishJobs: PublishService,
    private readonly templates: TemplatesService,
    private readonly apply: TemplateApplyService,
    private readonly localeJobs: SiteLocaleService,
  ) {}

  async createFromTemplate(
    userId: string,
    input: CreateSiteFromTemplateInput,
  ): Promise<WizardSiteResult> {
    const taken = await this.db.site.findUnique({
      where: { subdomain: input.subdomain },
      select: { id: true },
    });
    if (taken) throw ApiException.conflict('subdomain นี้ถูกใช้งานแล้ว');

    const pack = input.templateId
      ? this.templates.byId(input.templateId)
      : this.templates.forBusinessType(input.businessType);

    const extraLocales = [...new Set(input.locales)].filter(
      (locale) => locale !== input.localeDefault,
    );

    const tokens = this.apply.tokensForSite(pack, {
      styleId: input.styleId,
      ...(input.primaryColor ? { primaryColor: input.primaryColor } : {}),
      ...(input.accentColor ? { accentColor: input.accentColor } : {}),
    });

    const site = await this.db.site.create({
      data: {
        ownerId: userId,
        name: input.name,
        subdomain: input.subdomain,
        localeDefault: input.localeDefault,
        locales: [input.localeDefault, ...extraLocales],
        templateId: pack.manifest.id,
        themeTokens: tokens as unknown as Prisma.InputJsonValue,
        settings: {
          businessType: input.businessType,
          styleId: input.styleId,
          description: pack.manifest.description,
          templateKey: pack.key,
          ...(input.logoMediaId ? { logoMediaId: input.logoMediaId } : {}),
        } satisfies Prisma.InputJsonObject,
      },
    });

    const built = await this.db.forSite(site.id, async (tx) => {
      await tx.siteMember.create({ data: { siteId: site.id, userId, role: 'owner' } });
      await this.apply.writeGlobalBlocks(tx, site.id, pack);
      await this.apply.writeMenus(tx, site.id, pack);

      return this.apply.createSamplePages(tx, site.id, pack, {
        publishNow: input.publishNow,
        authorId: userId,
        locale: input.localeDefault,
      });
    });

    await this.audit.log({
      siteId: site.id,
      userId,
      action: 'site.create_from_template',
      target: site.id,
      meta: {
        subdomain: site.subdomain,
        template: pack.key,
        businessType: input.businessType,
        styleId: input.styleId,
        pages: built.pages.length,
        published: input.publishNow,
      },
    });

    // Queued after the commit so a rolled-back site is never rendered.
    if (input.publishNow) {
      await this.publishJobs.enqueueSite(site.id, [...built.paths, '/sitemap.xml']);
    }

    // The extra languages are copied and translated in the background, so step 5
    // never waits for the assistant (docs/design/17-i18n.md 17.1).
    await this.localeJobs.enqueue(site.id, extraLocales, userId, input.publishNow);

    return {
      siteId: site.id,
      name: site.name,
      subdomain: site.subdomain,
      templateId: pack.manifest.id,
      pages: built.pages,
      published: input.publishNow ? built.pages.length : 0,
    };
  }
}
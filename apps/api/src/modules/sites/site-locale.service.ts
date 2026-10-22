import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  isSiteLocaleJobStatus,
  type SiteLocaleJobStatus,
  type SiteLocaleStatus,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { AuditService } from '../audit/audit.service';
import { ContentsService } from '../contents/contents.service';
import { PrismaService } from '../prisma/prisma.service';
import { SITE_LOCALE_QUEUE, type SiteLocaleJob as QueuedSiteLocaleJob, type SiteLocaleQueue } from './site-locale.queue';

export interface SiteLocaleRunSummary {
  /** Languages finished (or already complete) by this run. */
  locales: number;
  /** Translated pages created by this run. */
  pages: number;
  /** Pages that could only be copied because the assistant refused. */
  copied: number;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};

const numberOr = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/** True when the assistant refused (no plan, quota, engine off), not a real error. */
const isAssistantRefusal = (error: unknown): boolean =>
  error instanceof ApiException && (error.code === 'forbidden' || error.code === 'conflict');

/**
 * Builds the extra languages of a freshly created site in the background
 * (docs/design/17-i18n.md 17.1). Every page is copied with new block ids and
 * translated when the assistant is allowed to; when it is not, the copy still
 * exists and the wizard says so, so the owner can translate it later with the
 * button in the editor.
 *
 * Progress lives in `site.settings.localeJobs`, which the wizard polls, so a
 * language build survives a page reload without another table.
 */
@Injectable()
export class SiteLocaleService {
  constructor(
    private readonly db: PrismaService,
    private readonly contents: ContentsService,
    private readonly audit: AuditService,
    @Inject(SITE_LOCALE_QUEUE) private readonly queue: SiteLocaleQueue,
  ) {}

  /** Marks every language pending, then queues one job for the whole site. */
  async enqueue(
    siteId: string,
    locales: readonly string[],
    userId: string,
    publishNow: boolean,
  ): Promise<void> {
    const wanted = [...new Set(locales.map((locale) => locale.trim().toLowerCase()))].filter(
      (locale) => locale.length > 0,
    );
    if (wanted.length === 0) return;

    const site = await this.db.site.findUnique({
      where: { id: siteId },
      select: { localeDefault: true },
    });
    if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');

    const extras = wanted.filter((locale) => locale !== site.localeDefault);
    if (extras.length === 0) return;

    for (const locale of extras) {
      await this.writeState(siteId, locale, { status: 'pending', error: null });
    }

    await this.queue.add({ siteId, locales: extras, userId, publishNow });
  }

  /** What the wizard shows while the languages are being built. */
  async status(siteId: string): Promise<SiteLocaleStatus> {
    const site = await this.db.site.findUnique({
      where: { id: siteId },
      select: { locales: true, localeDefault: true, settings: true },
    });
    if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');

    const jobs = asRecord(asRecord(site.settings).localeJobs);
    return {
      defaultLocale: site.localeDefault,
      locales: site.locales
        .filter((locale) => locale !== site.localeDefault)
        .map((locale) => {
          const raw = asRecord(jobs[locale]);
          const status: SiteLocaleJobStatus = isSiteLocaleJobStatus(raw.status)
            ? raw.status
            : 'pending';
          return {
            locale,
            status,
            pages: numberOr(raw.pages, 0),
            done: numberOr(raw.done, 0),
            translated: raw.translated !== false,
            error: typeof raw.error === 'string' ? raw.error : null,
            updatedAt:
              typeof raw.updatedAt === 'string'
                ? raw.updatedAt
                : new Date(0).toISOString(),
          };
        }),
    };
  }

  /**
   * Runs one job: one language at a time, one page at a time, so the owner sees
   * progress instead of waiting for every page at once. Re-running a job is safe:
   * languages that already exist are left alone.
   */
  async run(job: QueuedSiteLocaleJob): Promise<SiteLocaleRunSummary> {
    const summary: SiteLocaleRunSummary = { locales: 0, pages: 0, copied: 0 };

    const site = await this.db.site.findUnique({
      where: { id: job.siteId },
      select: { localeDefault: true },
    });
    if (!site) return summary;

    const pages = await this.db.forSite(job.siteId, (tx) =>
      tx.content.findMany({
        where: { locale: site.localeDefault, type: 'page', status: { not: 'archived' } },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      }),
    );
    if (pages.length === 0) return summary;

    for (const locale of job.locales) {
      let done = 0;
      let translated = true;

      await this.writeState(job.siteId, locale, {
        status: 'running',
        pages: pages.length,
        done: 0,
        translated: true,
        error: null,
      });

      try {
        for (const page of pages) {
          const existing = await this.contents.translations(job.siteId, page.id);
          if (existing.items.some((item) => item.locale === locale && item.exists)) {
            done += 1;
            continue;
          }

          const created = await this.createTranslation(job, page.id, locale).catch(
            (error: unknown) => {
              if (!isAssistantRefusal(error)) throw error;
              translated = false;
              return this.contents.createTranslation(
                job.siteId,
                page.id,
                { locale, translate: false },
                job.userId,
              );
            },
          );

          if (job.publishNow) {
            await this.contents.publish(job.siteId, created.id, job.userId);
          }

          done += 1;
          summary.pages += 1;
          if (!translated) summary.copied += 1;
          await this.writeState(job.siteId, locale, { done, translated });
        }

        await this.writeState(job.siteId, locale, {
          status: 'done',
          done,
          translated,
          error: null,
        });
        summary.locales += 1;

        await this.audit.log({
          siteId: job.siteId,
          userId: job.userId,
          action: 'site.locale_built',
          target: locale,
          meta: { pages: done, translated, published: job.publishNow },
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'สร้างภาษาไม่สำเร็จ';
        await this.writeState(job.siteId, locale, { status: 'failed', error: reason, done });
      }
    }

    return summary;
  }

  private createTranslation(
    job: QueuedSiteLocaleJob,
    contentId: string,
    locale: string,
  ): Promise<{ id: string }> {
    return this.contents.createTranslation(
      job.siteId,
      contentId,
      { locale, translate: true },
      job.userId,
    );
  }

  /** Merges one language's progress into `site.settings.localeJobs`. */
  private async writeState(
    siteId: string,
    locale: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    const site = await this.db.site.findUnique({
      where: { id: siteId },
      select: { settings: true },
    });
    if (!site) return;

    const settings = asRecord(site.settings);
    const jobs = asRecord(settings.localeJobs);
    const current = asRecord(jobs[locale]);

    jobs[locale] = {
      status: 'pending',
      pages: 0,
      done: 0,
      translated: true,
      error: null,
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    } as Prisma.InputJsonObject;

    await this.db.site.update({
      where: { id: siteId },
      data: {
        settings: { ...settings, localeJobs: jobs } as Prisma.InputJsonObject,
      },
    });
  }
}

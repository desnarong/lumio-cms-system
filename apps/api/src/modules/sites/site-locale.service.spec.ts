import { describe, expect, it, vi, type Mock } from 'vitest';
import { ApiException } from '../../common/api-error';
import type { AuditService } from '../audit/audit.service';
import type { ContentsService } from '../contents/contents.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { SiteLocaleJob, SiteLocaleQueue } from './site-locale.queue';
import { SiteLocaleService } from './site-locale.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const USER_ID = '00000000-0000-4000-8000-000000000001';

interface Stubs {
  db: PrismaService;
  update: Mock;
  add: Mock;
  createTranslation: Mock;
  publish: Mock;
  audit: { log: Mock };
  settings: () => Record<string, unknown>;
}

const stubs = (
  options: { pages?: { id: string }[]; existing?: string[]; refuseTranslate?: boolean } = {},
): Stubs => {
  let settings: Record<string, unknown> = { businessType: 'restaurant', styleKey: 'x' };
  const update = vi.fn(async ({ data }: { data: { settings: Record<string, unknown> } }) => {
    settings = data.settings;
    return {};
  });
  const add = vi.fn().mockResolvedValue({});
  const createTranslation = vi
    .fn()
    .mockImplementation(
      async (_siteId: string, contentId: string, input: { locale: string; translate: boolean }) => {
        if (input.translate && options.refuseTranslate) {
          throw ApiException.conflict('เดือนนี้ใช้ผู้ช่วย AI ครบแล้ว');
        }
        return { id: `${contentId}-${input.locale}` };
      },
    );
  const publish = vi.fn().mockResolvedValue({});

  const db = {
    site: {
      findUnique: vi.fn(async ({ select }: { select: Record<string, unknown> }) => {
        if (select.locales) {
          return { localeDefault: 'th', locales: ['th', 'en'], settings };
        }
        if (select.settings) return { settings };
        return { localeDefault: 'th' };
      }),
      update,
    },
    forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) =>
      fn({
        content: {
          findMany: vi.fn().mockResolvedValue(options.pages ?? [{ id: 'p1' }, { id: 'p2' }]),
        },
      }),
    ),
  } as unknown as PrismaService;

  return {
    db,
    update,
    add,
    createTranslation,
    publish,
    audit: { log: vi.fn().mockResolvedValue(undefined) },
    settings: () => settings,
  };
};

const service = (all: Stubs): SiteLocaleService =>
  new SiteLocaleService(
    all.db,
    {
      translations: vi.fn(async (_siteId: string, _contentId: string) => ({
        groupId: 'g1',
        defaultLocale: 'th',
        items: [],
      })),
      createTranslation: all.createTranslation,
      publish: all.publish,
    } as unknown as ContentsService,
    all.audit as unknown as AuditService,
    { add: all.add } as unknown as SiteLocaleQueue,
  );

const job = (overrides: Partial<SiteLocaleJob> = {}): SiteLocaleJob => ({
  id: 'loc_1',
  attempts: 1,
  createdAt: new Date().toISOString(),
  siteId: SITE_ID,
  locales: ['en'],
  userId: USER_ID,
  publishNow: true,
  ...overrides,
});

describe('SiteLocaleService.enqueue', () => {
  it('marks every requested language pending and queues one job', async () => {
    const all = stubs();

    await service(all).enqueue(SITE_ID, ['en', 'th', 'en'], USER_ID, true);

    expect(all.add).toHaveBeenCalledWith({
      siteId: SITE_ID,
      locales: ['en'],
      userId: USER_ID,
      publishNow: true,
    });
    const jobs = all.settings().localeJobs as Record<string, Record<string, unknown>>;
    expect(jobs.en).toMatchObject({ status: 'pending', done: 0 });
  });

  it('does nothing when only the default language was asked for', async () => {
    const all = stubs();

    await service(all).enqueue(SITE_ID, ['th'], USER_ID, false);

    expect(all.add).not.toHaveBeenCalled();
    expect(all.update).not.toHaveBeenCalled();
  });
});

describe('SiteLocaleService.run', () => {
  it('copies and translates every page, then publishes them', async () => {
    const all = stubs();

    const summary = await service(all).run(job());

    expect(all.createTranslation).toHaveBeenCalledTimes(2);
    expect(all.createTranslation).toHaveBeenCalledWith(
      SITE_ID,
      'p1',
      { locale: 'en', translate: true },
      USER_ID,
    );
    expect(all.publish).toHaveBeenCalledWith(SITE_ID, 'p1-en', USER_ID);
    expect(summary).toEqual({ locales: 1, pages: 2, copied: 0 });

    const jobs = all.settings().localeJobs as Record<string, Record<string, unknown>>;
    expect(jobs.en).toMatchObject({ status: 'done', pages: 2, done: 2, translated: true });
    expect(all.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'site.locale_built', target: 'en' }),
    );
  });

  it('skips a page that already exists in that language', async () => {
    const all = stubs();
    const locales = new SiteLocaleService(
      all.db,
      {
        translations: vi
          .fn()
          .mockResolvedValue({ groupId: 'g1', defaultLocale: 'th', items: [] })
          .mockResolvedValueOnce({
            groupId: 'g1',
            defaultLocale: 'th',
            items: [{ locale: 'en', exists: true, contentId: 'p1-en', title: 'x', slug: 'x', status: 'draft' }],
          }),
        createTranslation: all.createTranslation,
        publish: all.publish,
      } as unknown as ContentsService,
      all.audit as unknown as AuditService,
      { add: all.add } as unknown as SiteLocaleQueue,
    );

    const summary = await locales.run(job());

    expect(all.createTranslation).toHaveBeenCalledTimes(1);
    expect(summary.pages).toBe(1);
  });

  it('still copies the pages when the assistant refuses to translate', async () => {
    const all = stubs({ refuseTranslate: true });

    const summary = await service(all).run(job());

    expect(all.createTranslation).toHaveBeenCalledWith(
      SITE_ID,
      'p1',
      { locale: 'en', translate: false },
      USER_ID,
    );
    expect(summary).toEqual({ locales: 1, pages: 2, copied: 2 });

    const jobs = all.settings().localeJobs as Record<string, Record<string, unknown>>;
    expect(jobs.en).toMatchObject({ status: 'done', translated: false });
  });

  it('records a failure for the language without throwing', async () => {
    const all = stubs();
    all.createTranslation.mockRejectedValueOnce(new ApiException('internal_error', 'พัง'));

    const summary = await service(all).run(job());

    expect(summary.locales).toBe(0);
    const jobs = all.settings().localeJobs as Record<string, Record<string, unknown>>;
    expect(jobs.en).toMatchObject({ status: 'failed', error: 'พัง' });
  });
});

describe('SiteLocaleService.status', () => {
  it('reports one row per extra language', async () => {
    const all = stubs();

    await service(all).enqueue(SITE_ID, ['en'], USER_ID, false);
    const status = await service(all).status(SITE_ID);

    expect(status.locales).toHaveLength(1);
    expect(status.locales[0]).toMatchObject({ locale: 'en', status: 'pending', pages: 0 });
  });
});

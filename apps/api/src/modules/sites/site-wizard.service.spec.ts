import { describe, expect, it, vi, type Mock } from 'vitest';
import { normalizeThemeTokens } from '@lumio/shared';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { PublishService } from '../publish/publish.service';
import { TemplateApplyService } from '../templates/template-apply.service';
import { TemplatesService } from '../templates/templates.service';
import type { SiteLocaleService } from './site-locale.service';
import { SiteWizardService } from './site-wizard.service';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const SITE_ID = '00000000-0000-4000-8000-0000000000a1';

interface Stubs {
  db: PrismaService;
  createSite: Mock;
  memberCreate: Mock;
  pageCreate: Mock;
  versionCreate: Mock;
  menuCreate: Mock;
  globalBlockCreate: Mock;
  audit: { log: Mock };
  publish: { enqueueSite: Mock };
  locales: { enqueue: Mock };
}

/** Fake PrismaService whose `forSite` runs the callback against a fake tx. */
const stubs = (overrides: { subdomainTaken?: boolean } = {}): Stubs => {
  const memberCreate = vi.fn().mockResolvedValue({});
  const pageCreate = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
    id: `page-${String(data.slug)}`,
    title: data.title,
    slug: data.slug,
    type: data.type,
    status: data.status,
  }));
  const versionCreate = vi.fn().mockResolvedValue({});
  const menuCreate = vi.fn().mockResolvedValue({});
  const globalBlockCreate = vi.fn().mockResolvedValue({});
  const createSite = vi.fn().mockResolvedValue({
    id: SITE_ID,
    ownerId: USER_ID,
    name: 'ร้านกาแฟของฉัน',
    subdomain: 'my-cafe',
    localeDefault: 'th',
    locales: ['th'],
    templateId: null,
    themeTokens: {},
    settings: {},
    plan: 'free',
    createdAt: new Date('2026-10-23T00:00:00Z'),
    updatedAt: new Date('2026-10-23T00:00:00Z'),
  });

  const db = {
    site: {
      findUnique: vi.fn().mockResolvedValue(overrides.subdomainTaken ? { id: SITE_ID } : null),
      create: createSite,
    },
    forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) =>
      fn({
        siteMember: { create: memberCreate },
        globalBlock: { deleteMany: vi.fn().mockResolvedValue({}), create: globalBlockCreate },
        menu: { findFirst: vi.fn().mockResolvedValue(null), create: menuCreate, update: vi.fn() },
        content: { create: pageCreate },
        contentVersion: { create: versionCreate },
      }),
    ),
  } as unknown as PrismaService;

  return {
    db,
    createSite,
    memberCreate,
    pageCreate,
    versionCreate,
    menuCreate,
    globalBlockCreate,
    audit: { log: vi.fn().mockResolvedValue(undefined) },
    publish: { enqueueSite: vi.fn().mockResolvedValue({}) },
    locales: { enqueue: vi.fn().mockResolvedValue(undefined) },
  };
};

const service = (all: Stubs): SiteWizardService =>
  new SiteWizardService(
    all.db,
    all.audit as unknown as AuditService,
    all.publish as unknown as PublishService,
    new TemplatesService(),
    new TemplateApplyService(),
    all.locales as unknown as SiteLocaleService,
  );

describe('SiteWizardService languages', () => {
  it('stores every language and queues the extra ones for the background build', async () => {
    const all = stubs();

    await service(all).createFromTemplate(USER_ID, {
      name: 'ร้านกาแฟของฉัน',
      subdomain: 'my-cafe',
      localeDefault: 'th',
      businessType: 'restaurant',
      styleId: 'soft',
      locales: ['en'],
      publishNow: true,
    });

    const data = all.createSite.mock.calls[0]?.[0]?.data as Record<string, unknown>;
    expect(data.locales).toEqual(['th', 'en']);
    expect(all.locales.enqueue).toHaveBeenCalledWith(SITE_ID, ['en'], USER_ID, true);
  });

  it('queues nothing extra for a single-language site', async () => {
    const all = stubs();

    await service(all).createFromTemplate(USER_ID, {
      name: 'ร้านกาแฟของฉัน',
      subdomain: 'my-cafe',
      localeDefault: 'th',
      businessType: 'restaurant',
      styleId: 'soft',
      locales: [],
      publishNow: true,
    });

    expect(all.locales.enqueue).toHaveBeenCalledWith(SITE_ID, [], USER_ID, true);
  });
});

describe('SiteWizardService', () => {
  it('builds a site from the template of the chosen business type', async () => {
    const all = stubs();

    const result = await service(all).createFromTemplate(USER_ID, {
      name: 'ร้านกาแฟของฉัน',
      subdomain: 'my-cafe',
      localeDefault: 'th',
      locales: [],
      businessType: 'restaurant',
      styleId: 'soft',
      publishNow: true,
    });

    expect(result.pages.length).toBeGreaterThanOrEqual(4);
    expect(result.published).toBe(result.pages.length);
    expect(result.templateId).toBeTruthy();
    expect(all.memberCreate).toHaveBeenCalledWith({
      data: { siteId: SITE_ID, userId: USER_ID, role: 'owner' },
    });
  });

  it('writes header/footer global blocks and both menus from the pack', async () => {
    const all = stubs();

    await service(all).createFromTemplate(USER_ID, {
      name: 'คลินิกของฉัน',
      subdomain: 'my-clinic',
      localeDefault: 'th',
      locales: [],
      businessType: 'clinic',
      styleId: 'minimal',
      publishNow: false,
    });

    expect(all.globalBlockCreate).toHaveBeenCalledTimes(2);
    expect(all.menuCreate).toHaveBeenCalledTimes(2);
    expect(all.menuCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ location: 'header' }),
      }),
    );
  });

  it('publishes the sample pages and queues one rebuild with every path', async () => {
    const all = stubs();

    const result = await service(all).createFromTemplate(USER_ID, {
      name: 'ร้านกาแฟของฉัน',
      subdomain: 'my-cafe',
      localeDefault: 'th',
      locales: [],
      businessType: 'restaurant',
      styleId: 'soft',
      publishNow: true,
    });

    // The home page is served at "/" (docs/design/12-api.md publicPathFor).
    const [siteId, paths] = all.publish.enqueueSite.mock.calls[0] as [string, string[]];
    expect(siteId).toBe(SITE_ID);
    expect(paths).toContain('/');
    expect(paths).toContain('/sitemap.xml');
    expect(paths).toHaveLength(result.pages.length + 1);
    expect(all.versionCreate).toHaveBeenCalledTimes(result.pages.length);
  });

  it('keeps the pages as drafts and skips rebuilds when publishNow is false', async () => {
    const all = stubs();

    const result = await service(all).createFromTemplate(USER_ID, {
      name: 'ร้านกาแฟของฉัน',
      subdomain: 'my-cafe',
      localeDefault: 'th',
      locales: [],
      businessType: 'restaurant',
      styleId: 'soft',
      publishNow: false,
    });

    expect(result.published).toBe(0);
    expect(all.publish.enqueueSite).not.toHaveBeenCalled();
    expect(all.pageCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'draft' }) }),
    );
  });

  it('stores the wizard answers in the site theme and settings', async () => {
    const all = stubs();

    await service(all).createFromTemplate(USER_ID, {
      name: 'สตูดิโอของฉัน',
      subdomain: 'my-studio',
      localeDefault: 'th',
      locales: [],
      businessType: 'freelance',
      styleId: 'elegant',
      primaryColor: '#123456',
      logoMediaId: '00000000-0000-4000-8000-0000000000b1',
      publishNow: true,
    });

    const [createArgs] = all.createSite.mock.calls[0] as [{ data: Record<string, unknown> }];
    const tokens = normalizeThemeTokens(createArgs.data.themeTokens);

    expect(tokens.colors.primary).toBe('#123456');
    expect(tokens.fonts.heading).toBe('Playfair Display');
    expect(createArgs.data.settings).toMatchObject({
      businessType: 'freelance',
      styleId: 'elegant',
      logoMediaId: '00000000-0000-4000-8000-0000000000b1',
    });
    expect(all.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'site.create_from_template' }),
    );
  });

  it('refuses a subdomain another site already uses', async () => {
    const all = stubs({ subdomainTaken: true });

    await expect(
      service(all).createFromTemplate(USER_ID, {
        name: 'ซ้ำ',
        subdomain: 'my-cafe',
        localeDefault: 'th',
        locales: [],
        businessType: 'other',
        styleId: 'soft',
        publishNow: true,
      }),
    ).rejects.toMatchObject({ code: 'conflict' });

    expect(all.createSite).not.toHaveBeenCalled();
    expect(all.publish.enqueueSite).not.toHaveBeenCalled();
  });

  it('queues nothing when the site could not be built', async () => {
    const all = stubs();
    (all.db.forSite as Mock).mockRejectedValue(new Error('transaction ล้มเหลว'));

    await expect(
      service(all).createFromTemplate(USER_ID, {
        name: 'พัง',
        subdomain: 'broken',
        localeDefault: 'th',
        locales: [],
        businessType: 'restaurant',
        styleId: 'soft',
        publishNow: true,
      }),
    ).rejects.toThrow('transaction ล้มเหลว');

    expect(all.publish.enqueueSite).not.toHaveBeenCalled();
    expect(all.audit.log).not.toHaveBeenCalled();
  });
});
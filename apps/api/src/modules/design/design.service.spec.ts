import { describe, expect, it, vi, type Mock } from 'vitest';
import type { AuditService } from '../audit/audit.service';
import type { PrismaService } from '../prisma/prisma.service';
import { TemplateApplyService } from '../templates/template-apply.service';
import { TemplatesService } from '../templates/templates.service';
import { DesignService } from './design.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const USER_ID = '00000000-0000-4000-8000-000000000001';

interface Stubs {
  db: PrismaService;
  siteUpdate: Mock;
  globalBlockCreate: Mock;
  globalBlockDeleteMany: Mock;
  menuCreate: Mock;
  contentCreate: Mock;
  auditLogCreate: Mock;
  audit: { log: Mock };
}

const stubs = (
  site: Record<string, unknown> = {},
  txExtras: Record<string, unknown> = {},
): Stubs => {
  const siteUpdate = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
    id: SITE_ID,
    templateId: data.templateId ?? null,
    settings: data.settings ?? {},
  }));
  const globalBlockCreate = vi.fn().mockResolvedValue({});
  const globalBlockDeleteMany = vi.fn().mockResolvedValue({});
  const menuCreate = vi.fn().mockResolvedValue({});
  const contentCreate = vi.fn().mockResolvedValue({});
  const auditLogCreate = vi.fn().mockResolvedValue({});

  const row = {
    id: SITE_ID,
    templateId: null,
    themeTokens: { colorBrand: '#8B5E3C', colorAccent: '#D9A05B' },
    settings: { styleId: 'soft' },
    ...site,
  };

  const db = {
    forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) =>
      fn({
        site: { findUnique: vi.fn().mockResolvedValue(row), update: siteUpdate },
        globalBlock: { create: globalBlockCreate, deleteMany: globalBlockDeleteMany },
        menu: { findFirst: vi.fn().mockResolvedValue(null), create: menuCreate, update: vi.fn() },
        content: { create: contentCreate, update: vi.fn(), delete: vi.fn() },
        auditLog: { create: auditLogCreate },
        ...txExtras,
      }),
    ),
  } as unknown as PrismaService;

  return {
    db,
    siteUpdate,
    globalBlockCreate,
    globalBlockDeleteMany,
    menuCreate,
    contentCreate,
    auditLogCreate,
    audit: { log: vi.fn().mockResolvedValue(undefined) },
  };
};

const service = (all: Stubs): DesignService =>
  new DesignService(
    all.db,
    all.audit as unknown as AuditService,
    new TemplatesService(),
    new TemplateApplyService(),
  );

describe('DesignService', () => {
  it('reads tokens and upgrades the flat shape older sites stored', async () => {
    const design = await service(stubs()).getTokens(SITE_ID);

    expect(design.tokens.colors.primary).toBe('#8B5E3C');
    expect(design.tokens.fonts.heading).toBeTruthy();
    expect(design.styleId).toBe('soft');
    expect(design.templateId).toBeNull();
  });

  it('merges a patch into the stored tokens and audits the change', async () => {
    const all = stubs();

    const design = await service(all).updateTokens(
      SITE_ID,
      { colors: { primary: '#0E7490' }, density: 'compact' },
      USER_ID,
    );

    expect(design.tokens.colors.primary).toBe('#0E7490');
    expect(design.tokens.colors.accent).toBe('#D9A05B');
    expect(design.tokens.density).toBe('compact');
    expect(all.siteUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          themeTokens: expect.objectContaining({ density: 'compact' }),
        }),
      }),
    );
    expect(all.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'design.tokens_update' }),
      }),
    );
  });

  it('swaps template tokens, header and footer without touching content', async () => {
    const all = stubs();
    const restaurant = new TemplatesService().forBusinessType('restaurant');

    const result = await service(all).applyTemplate(
      SITE_ID,
      restaurant.manifest.id,
      { applyHeaderFooter: true },
      USER_ID,
    );

    expect(result.templateId).toBe(restaurant.manifest.id);
    expect(result.headerFooterApplied).toBe(true);
    expect(result.tokens.colors.primary).toBe(restaurant.tokens.colors.primary);
    expect(all.globalBlockDeleteMany).toHaveBeenCalled();
    expect(all.globalBlockCreate).toHaveBeenCalledTimes(2);
    expect(all.menuCreate).toHaveBeenCalledTimes(2);
    expect(all.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'design.template_apply' }),
      }),
    );
    // The user's pages are presentation-independent: never rewritten.
    expect(all.contentCreate).not.toHaveBeenCalled();
  });

  it('keeps the current header and footer when the owner says so', async () => {
    const all = stubs();
    const clinic = new TemplatesService().forBusinessType('clinic');

    const result = await service(all).applyTemplate(
      SITE_ID,
      clinic.manifest.id,
      { applyHeaderFooter: false },
      USER_ID,
    );

    expect(result.headerFooterApplied).toBe(false);
    expect(all.globalBlockDeleteMany).not.toHaveBeenCalled();
    expect(all.menuCreate).not.toHaveBeenCalled();
  });

  it('refuses a template id that does not exist', async () => {
    await expect(
      service(stubs()).applyTemplate(
        SITE_ID,
        '00000000-0000-4000-8000-0000000000ff',
        { applyHeaderFooter: true },
        USER_ID,
      ),
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it('resets tokens back to the template the site uses', async () => {
    const restaurant = new TemplatesService().forBusinessType('restaurant');
    const all = stubs({ templateId: restaurant.manifest.id });

    const design = await service(all).resetTokens(SITE_ID, USER_ID);

    expect(design.tokens.colors.primary).toBe(restaurant.tokens.colors.primary);
    expect(all.siteUpdate).toHaveBeenCalled();
  });

  it('falls back to the default tokens when no template is recorded', async () => {
    const all = stubs({ templateId: null });

    const design = await service(all).resetTokens(SITE_ID, USER_ID);

    expect(design.tokens.colors.primary).toBe('#4F46E5');
  });
});
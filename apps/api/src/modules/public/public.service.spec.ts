import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONTACT_FORM_FIELDS } from '@lumio/shared';
import type { PrismaService } from '../prisma/prisma.service';
import { PublicService } from './public.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';
const FORM_ID = '00000000-0000-4000-8000-0000000000f1';

const siteRow = (overrides: Record<string, unknown> = {}) => ({
  id: SITE_ID,
  ownerId: null,
  name: 'กาแฟบ้านดอย',
  subdomain: 'baandoi',
  localeDefault: 'th',
  locales: ['th'],
  templateId: null,
  themeTokens: { colorBrand: '#8B5E3C' },
  settings: {},
  plan: 'pro',
  createdAt: new Date('2026-09-01T00:00:00Z'),
  updatedAt: new Date('2026-09-01T00:00:00Z'),
  ...overrides,
});

const contentRow = (overrides: Record<string, unknown> = {}) => ({
  id: '00000000-0000-4000-8000-0000000000c1',
  siteId: SITE_ID,
  type: 'page',
  title: 'หน้าแรก',
  slug: 'home',
  locale: 'th',
  status: 'published',
  blocksDraft: [{ id: 'draft-only', type: 'heading', version: 1, props: {}, style: {}, children: [] }],
  blocksPublished: [
    { id: 'b1', type: 'heading', version: 1, props: { text: 'กาแฟบ้านดอย' }, style: {}, children: [] },
  ],
  excerpt: 'กาแฟคั่วสดใหม่',
  coverMediaId: null,
  authorId: null,
  seo: { title: 'กาแฟบ้านดอย', noindex: false },
  revision: 2,
  publishedAt: new Date('2026-09-01T02:00:00Z'),
  scheduledAt: null,
  createdAt: new Date('2026-08-01T00:00:00Z'),
  updatedAt: new Date('2026-10-20T00:00:00Z'),
  coverMedia: null,
  ...overrides,
});

interface DbOptions {
  domain?: unknown;
  site?: unknown;
  tx?: Record<string, unknown>;
}

/** Transaction target with the queries the service always issues. */
const txWith = (overrides: Record<string, unknown> = {}): Record<string, unknown> => {
  const base: Record<string, unknown> = {
    content: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    menu: { findMany: vi.fn().mockResolvedValue([]) },
    globalBlock: { findMany: vi.fn().mockResolvedValue([]) },
    media: { findFirst: vi.fn().mockResolvedValue(null) },
    redirect: { findFirst: vi.fn().mockResolvedValue(null) },
    product: { findMany: vi.fn().mockResolvedValue([]) },
  };

  const merged = { ...base, ...overrides };
  // Deep-merge `content` so a test overriding `findFirst` keeps the shared `findMany`.
  merged.content = {
    ...(base.content as Record<string, unknown>),
    ...((overrides.content as Record<string, unknown> | undefined) ?? {}),
  };
  return merged;
};

const dbWith = (options: DbOptions = {}): PrismaService =>
  ({
    domain: { findUnique: vi.fn().mockResolvedValue(options.domain ?? null) },
    site: { findUnique: vi.fn().mockResolvedValue(options.site ?? null) },
    forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) => fn(txWith(options.tx))),
  }) as unknown as PrismaService;

const service = (options: DbOptions = {}): PublicService => new PublicService(dbWith(options));

describe('PublicService host resolution', () => {
  it('resolves a verified custom domain first', async () => {
    const db = dbWith({
      domain: { hostname: 'baandoicoffee.com', site: siteRow() },
      tx: { content: { findFirst: vi.fn().mockResolvedValue(contentRow()) }, menu: { findMany: vi.fn().mockResolvedValue([]) } },
    });

    const page = await new PublicService(db).getPage('baandoicoffee.com', 'home');

    expect(page.site.name).toBe('กาแฟบ้านดอย');
    expect(page.content?.blocks[0]?.props.text).toBe('กาแฟบ้านดอย');
  });

  it('falls back to the *.lumio.app subdomain', async () => {
    const siteFindUnique = vi.fn().mockResolvedValue(siteRow());
    const db = {
      domain: { findUnique: vi.fn().mockResolvedValue(null) },
      site: { findUnique: siteFindUnique },
      forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) =>
        fn(
          txWith({
            content: { findFirst: vi.fn().mockResolvedValue(contentRow()) },
          }),
        ),
      ),
    } as unknown as PrismaService;

    await new PublicService(db).getPage('baandoi.lumio.app', 'home');

    expect(siteFindUnique).toHaveBeenCalledWith({ where: { subdomain: 'baandoi' } });
  });

  it('hides an unknown host instead of guessing a site', async () => {
    await expect(service().getPage('nobody.example.com', 'home')).rejects.toMatchObject({
      code: 'not_found',
    });
  });

  it('only uses PUBLIC_DEFAULT_SITE on loopback hosts', async () => {
    const previous = process.env.PUBLIC_DEFAULT_SITE;
    process.env.PUBLIC_DEFAULT_SITE = 'baandoi';

    const loopback = {
      domain: { findUnique: vi.fn().mockResolvedValue(null) },
      site: { findUnique: vi.fn().mockResolvedValue(siteRow()) },
      forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) =>
        fn(
          txWith({
            content: { findFirst: vi.fn().mockResolvedValue(contentRow()) },
          }),
        ),
      ),
    } as unknown as PrismaService;

    const page = await new PublicService(loopback).getPage('localhost:49200', 'home');
    expect(page.site.subdomain).toBe('baandoi');

    await expect(service().getPage('baandoi.lumio.app', 'home')).rejects.toMatchObject({
      code: 'not_found',
    });

    if (previous === undefined) delete process.env.PUBLIC_DEFAULT_SITE;
    else process.env.PUBLIC_DEFAULT_SITE = previous;
  });
});

describe('PublicService.getPage', () => {
  it('serves published blocks and never the draft', async () => {
    const page = await service({
      domain: { hostname: 'baandoi.lumio.app', site: siteRow() },
      tx: {
        content: { findFirst: vi.fn().mockResolvedValue(contentRow()) },
        menu: { findMany: vi.fn().mockResolvedValue([]) },
      },
    }).getPage('baandoi.lumio.app', 'home');

    expect(page.content?.blocks).toHaveLength(1);
    expect(page.content?.blocks[0]?.id).toBe('b1');
    expect(page.redirect).toBeNull();
    expect(page.content?.publishedAt).toBe('2026-09-01T02:00:00.000Z');
  });

  it('asks only for published content of the site default locale', async () => {
    const findFirst = vi.fn().mockResolvedValue(contentRow());
    await service({
      domain: { hostname: 'baandoi.lumio.app', site: siteRow() },
      tx: { content: { findFirst }, menu: { findMany: vi.fn().mockResolvedValue([]) } },
    }).getPage('baandoi.lumio.app', 'about');

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type: 'page', status: 'published', locale: 'th', slug: 'about' },
      }),
    );
  });

  it('serves the requested language and marks the languages a page has', async () => {
    const findFirst = vi.fn().mockResolvedValue(contentRow({ locale: 'en', slug: 'home' }));
    const findMany = vi.fn().mockResolvedValue([
      { locale: 'th', slug: 'home', title: 'หน้าแรก' },
      { locale: 'en', slug: 'home', title: 'Home' },
    ]);

    const page = await service({
      domain: { hostname: 'baandoi.lumio.app', site: siteRow({ locales: ['th', 'en'] }) },
      tx: { content: { findFirst, findMany } },
    }).getPage('baandoi.lumio.app', 'home', 'en');

    expect(page.locale).toBe('en');
    expect(page.isFallback).toBe(false);
    expect(page.translations.map((entry) => entry.path)).toEqual(['/', '/en']);
    expect(page.translations.every((entry) => entry.available)).toBe(true);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type: 'page', status: 'published', locale: 'en', slug: 'home' },
      }),
    );
  });

  it('falls back to the default language when the requested one has no page', async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce(null) // no English page yet
      .mockResolvedValueOnce(contentRow()); // Thai fallback

    const page = await service({
      domain: { hostname: 'baandoi.lumio.app', site: siteRow({ locales: ['th', 'en'] }) },
      tx: {
        content: {
          findFirst,
          findMany: vi
            .fn()
            .mockResolvedValue([{ locale: 'th', slug: 'home', title: 'หน้าแรก' }]),
        },
      },
    }).getPage('baandoi.lumio.app', 'home', 'en');

    expect(page.isFallback).toBe(true);
    expect(page.locale).toBe('th');
    expect(page.translations.find((entry) => entry.locale === 'en')?.available).toBe(false);
  });

  it('returns the redirect target when the slug moved', async () => {
    const page = await service({
      domain: { hostname: 'baandoi.lumio.app', site: siteRow() },
      tx: {
        content: { findFirst: vi.fn().mockResolvedValue(null) },
        menu: { findMany: vi.fn().mockResolvedValue([]) },
        redirect: {
          findFirst: vi.fn().mockResolvedValue({ toPath: '/about', code: 301 }),
        },
      },
    }).getPage('baandoi.lumio.app', 'about-us');

    expect(page.content).toBeNull();
    expect(page.redirect).toEqual({ to: '/about', code: 301 });
  });

  it('matches a redirect that keeps the language prefix', async () => {
    const redirectFindFirst = vi.fn().mockResolvedValue({ toPath: '/en/about', code: 301 });
    const page = await service({
      domain: { hostname: 'baandoi.lumio.app', site: siteRow({ locales: ['th', 'en'] }) },
      tx: {
        content: { findFirst: vi.fn().mockResolvedValue(null) },
        menu: { findMany: vi.fn().mockResolvedValue([]) },
        redirect: { findFirst: redirectFindFirst },
      },
    }).getPage('baandoi.lumio.app', 'about-us', 'en');

    expect(page.redirect).toEqual({ to: '/en/about', code: 301 });
    expect(redirectFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fromPath: { in: ['/about-us', 'about-us', '/en/about-us'] } },
      }),
    );
  });

  it('404s when neither content nor a redirect matches', async () => {
    await expect(
      service({
        domain: { hostname: 'baandoi.lumio.app', site: siteRow() },
        tx: {
          content: { findFirst: vi.fn().mockResolvedValue(null) },
          menu: { findMany: vi.fn().mockResolvedValue([]) },
          redirect: { findFirst: vi.fn().mockResolvedValue(null) },
        },
      }).getPage('baandoi.lumio.app', 'missing'),
    ).rejects.toMatchObject({ code: 'not_found' });
  });

  it('reads the header and footer menus into the payload', async () => {
    const page = await service({
      domain: { hostname: 'baandoi.lumio.app', site: siteRow() },
      tx: {
        content: { findFirst: vi.fn().mockResolvedValue(contentRow()) },
        menu: {
          findMany: vi.fn().mockResolvedValue([
            { location: 'header', items: [{ label: 'หน้าแรก', href: '/' }] },
            { location: 'footer', items: [{ label: 'ติดต่อ', href: '/contact' }] },
          ]),
        },
      },
    }).getPage('baandoi.lumio.app', 'home');

    expect(page.menus.header).toEqual([{ label: 'หน้าแรก', href: '/', children: [] }]);
    expect(page.menus.footer[0]?.label).toBe('ติดต่อ');
  });

  it('sends the global header and footer blocks of the template', async () => {
    const page = await service({
      domain: { hostname: 'baandoi.lumio.app', site: siteRow() },
      tx: {
        content: { findFirst: vi.fn().mockResolvedValue(contentRow()) },
        globalBlock: {
          findMany: vi.fn().mockResolvedValue([
            {
              kind: 'header',
              blocks: [
                { id: 'h1', type: 'button', version: 1, props: { label: 'โทรสอบถาม' }, style: {}, children: [] },
              ],
            },
            {
              kind: 'footer',
              blocks: [
                { id: 'f1', type: 'paragraph', version: 1, props: { text: 'เปิดทุกวัน' }, style: {}, children: [] },
              ],
            },
          ]),
        },
      },
    }).getPage('baandoi.lumio.app', 'home');

    expect(page.globalBlocks.header.map((block) => block.id)).toEqual(['h1']);
    expect(page.globalBlocks.footer.map((block) => block.id)).toEqual(['f1']);
  });

  it('resolves the logo uploaded during onboarding into a URL', async () => {
    const page = await service({
      domain: {
        hostname: 'baandoi.lumio.app',
        site: siteRow({ settings: { logoMediaId: '00000000-0000-4000-8000-0000000000b1' } }),
      },
      tx: {
        content: { findFirst: vi.fn().mockResolvedValue(contentRow()) },
        media: {
          findFirst: vi.fn().mockResolvedValue({
            storageKey: 'baandoi/logo/logo.png',
            variants: [],
            status: 'ready',
          }),
        },
      },
    }).getPage('baandoi.lumio.app', 'home');

    expect(page.site.logoUrl).toBe('http://localhost:49100/media/baandoi/logo/logo.png');
  });

  it('leaves the logo empty when no logo was uploaded', async () => {
    const page = await service({
      domain: { hostname: 'baandoi.lumio.app', site: siteRow() },
      tx: { content: { findFirst: vi.fn().mockResolvedValue(contentRow()) } },
    }).getPage('baandoi.lumio.app', 'home');

    expect(page.site.logoUrl).toBeNull();
  });

  it('carries the contact forms the page renders', async () => {
    const formFindMany = vi.fn().mockResolvedValue([
      {
        id: FORM_ID,
        name: 'ติดต่อเรา',
        fields: DEFAULT_CONTACT_FORM_FIELDS,
        successMessage: 'ขอบคุณที่ติดต่อเรา',
      },
    ]);

    const page = await service({
      domain: { hostname: 'baandoi.lumio.app', site: siteRow() },
      tx: {
        content: {
          findFirst: vi.fn().mockResolvedValue(
            contentRow({
              blocksPublished: [
                {
                  id: 'b1',
                  type: 'form',
                  version: 1,
                  props: { formId: FORM_ID },
                  style: {},
                  children: [],
                },
              ],
            }),
          ),
        },
        form: { findMany: formFindMany },
      },
    }).getPage('baandoi.lumio.app', 'home');

    expect(page.forms.map((form) => form.id)).toEqual([FORM_ID]);
    expect(page.forms[0]?.fields).toHaveLength(DEFAULT_CONTACT_FORM_FIELDS.length);
    expect(formFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: [FORM_ID] } } }),
    );
  });

  it('never queries forms when no block points at one', async () => {
    // The shared tx stub has no `form` model, so any query would throw.
    const page = await service({
      domain: { hostname: 'baandoi.lumio.app', site: siteRow() },
      tx: { content: { findFirst: vi.fn().mockResolvedValue(contentRow()) } },
    }).getPage('baandoi.lumio.app', 'home');

    expect(page.forms).toEqual([]);
  });
});

describe('PublicService.listPosts', () => {
  it('maps posts newest first and exposes the cover image URL', async () => {
    const rows = [
      contentRow({
        id: 'p1',
        type: 'post',
        slug: 'how-to-pick-beans',
        title: 'เลือกเมล็ดกาแฟ',
        coverMedia: { storageKey: 'baandoi/posts/beans.jpg', variants: [] },
      }),
    ];

    const list = await service({
      domain: { hostname: 'baandoi.lumio.app', site: siteRow() },
      tx: {
        content: { findMany: vi.fn().mockResolvedValue(rows) },
        menu: { findMany: vi.fn().mockResolvedValue([]) },
      },
    }).listPosts('baandoi.lumio.app', 10);

    expect(list.posts).toHaveLength(1);
    expect(list.posts[0]).toMatchObject({
      slug: 'how-to-pick-beans',
      coverImage: 'http://localhost:49100/media/baandoi/posts/beans.jpg',
    });
  });

  it('prefers a generated variant over the original file', async () => {
    const rows = [
      contentRow({
        type: 'post',
        coverMedia: {
          storageKey: 'baandoi/posts/beans.jpg',
          variants: [{ w: 640, format: 'webp', url: 'baandoi/posts/beans-640.webp' }],
        },
      }),
    ];

    const list = await service({
      domain: { hostname: 'baandoi.lumio.app', site: siteRow() },
      tx: {
        content: { findMany: vi.fn().mockResolvedValue(rows) },
        menu: { findMany: vi.fn().mockResolvedValue([]) },
      },
    }).listPosts('baandoi.lumio.app', 10);

    expect(list.posts[0]?.coverImage).toBe('http://localhost:49100/media/baandoi/posts/beans-640.webp');
  });
});

describe('PublicService.sitemap', () => {
  it('lists published pages and posts with their public paths', async () => {
    const rows = [
      { id: 'c1', type: 'page', slug: 'home', title: 'หน้าแรก', locale: 'th', translationGroupId: null, updatedAt: new Date('2026-10-20T00:00:00Z'), seo: {} },
      { id: 'c3', type: 'post', slug: 'how-to-pick-beans', title: 'เลือกเมล็ดกาแฟ', locale: 'th', translationGroupId: null, updatedAt: new Date('2026-10-01T00:00:00Z'), seo: {} },
    ];

    const sitemap = await service({
      domain: { hostname: 'baandoi.lumio.app', site: siteRow() },
      tx: { content: { findMany: vi.fn().mockResolvedValue(rows) } },
    }).sitemap('baandoi.lumio.app');

    expect(sitemap.urls.map((url) => url.path)).toEqual(['/', '/posts/how-to-pick-beans']);
  });

  it('gives each language of a page its own URL with the others as alternates', async () => {
    const rows = [
      { id: 'c1', type: 'page', slug: 'about', title: 'เกี่ยวกับเรา', locale: 'th', translationGroupId: 'g1', updatedAt: new Date('2026-10-20T00:00:00Z'), seo: {} },
      { id: 'c2', type: 'page', slug: 'about', title: 'About', locale: 'en', translationGroupId: 'g1', updatedAt: new Date('2026-10-20T00:00:00Z'), seo: {} },
    ];

    const sitemap = await service({
      domain: { hostname: 'baandoi.lumio.app', site: siteRow({ locales: ['th', 'en'] }) },
      tx: { content: { findMany: vi.fn().mockResolvedValue(rows) } },
    }).sitemap('baandoi.lumio.app');

    expect(sitemap.urls.map((url) => url.path)).toEqual(['/about', '/en/about']);
    expect(sitemap.urls[1]?.alternates.map((alt) => alt.path)).toEqual(['/about', '/en/about']);
  });

  it('keeps noindex pages out of the sitemap', async () => {
    const rows = [
      { type: 'page', slug: 'secret', updatedAt: new Date('2026-10-20T00:00:00Z'), seo: { noindex: true } },
    ];

    const sitemap = await service({
      domain: { hostname: 'baandoi.lumio.app', site: siteRow() },
      tx: { content: { findMany: vi.fn().mockResolvedValue(rows) } },
    }).sitemap('baandoi.lumio.app');

    expect(sitemap.urls).toEqual([]);
  });

  it('adds active shop products to the sitemap', async () => {
    const sitemap = await service({
      site: siteRow(),
      tx: {
        content: { findMany: vi.fn().mockResolvedValue([]) },
        product: {
          findMany: vi.fn().mockResolvedValue([
            { slug: 'medium-roast', updatedAt: new Date('2026-10-21T00:00:00Z') },
          ]),
        },
      },
    }).sitemap('baandoi.lumio.app');

    expect(sitemap.shop).toEqual([
      { path: '/shop/medium-roast', lastmod: '2026-10-21T00:00:00.000Z' },
    ]);
  });
});

describe('PublicService language delivery', () => {
  const bilingualSite = siteRow({ locales: ['th', 'en'], localeDefault: 'th' });

  it('reports the languages of a host for Accept-Language negotiation', async () => {
    const locales = await service({
      domain: { hostname: 'baandoi.lumio.app', site: bilingualSite },
    }).locales('baandoi.lumio.app');

    expect(locales).toEqual({
      locales: ['th', 'en'],
      defaultLocale: 'th',
      localeFromHost: null,
    });
  });

  it('prefers a language-specific menu over the shared one', async () => {
    const page = await service({
      domain: { hostname: 'baandoi.lumio.app', site: bilingualSite },
      tx: {
        content: { findFirst: vi.fn().mockResolvedValue(contentRow({ locale: 'en' })) },
        menu: {
          findMany: vi.fn().mockResolvedValue([
            { location: 'header', locale: null, items: [{ label: 'หน้าแรก', href: '/' }] },
            { location: 'header', locale: 'en', items: [{ label: 'Home', href: '/en' }] },
          ]),
        },
      },
    }).getPage('baandoi.lumio.app', 'home', 'en');

    expect(page.menus.header.map((item) => item.label)).toEqual(['Home']);
  });

  it('keeps the shared menu when the language has none of its own', async () => {
    const page = await service({
      domain: { hostname: 'baandoi.lumio.app', site: bilingualSite },
      tx: {
        content: { findFirst: vi.fn().mockResolvedValue(contentRow({ locale: 'en' })) },
        menu: {
          findMany: vi.fn().mockResolvedValue([
            { location: 'header', locale: null, items: [{ label: 'หน้าแรก', href: '/' }] },
          ]),
        },
      },
    }).getPage('baandoi.lumio.app', 'home', 'en');

    expect(page.menus.header.map((item) => item.label)).toEqual(['หน้าแรก']);
  });

  it('serves the contact form of the requested language', async () => {
    const thForm = {
      id: FORM_ID,
      name: 'ติดต่อเรา',
      fields: DEFAULT_CONTACT_FORM_FIELDS,
      successMessage: 'ขอบคุณ',
      locale: 'th',
      translationGroupId: FORM_ID,
    };
    const enForm = {
      id: 'form-en',
      name: 'Contact us',
      fields: DEFAULT_CONTACT_FORM_FIELDS,
      successMessage: 'Thank you',
      locale: 'en',
      translationGroupId: FORM_ID,
    };

    const page = await service({
      domain: { hostname: 'baandoi.lumio.app', site: bilingualSite },
      tx: {
        content: {
          findFirst: vi.fn().mockResolvedValue(
            contentRow({
              locale: 'en',
              blocksPublished: [
                {
                  id: 'f1',
                  type: 'form',
                  version: 1,
                  props: { formId: FORM_ID },
                  style: {},
                  children: [],
                },
              ],
            }),
          ),
        },
        form: {
          findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
            'id' in where ? [thForm] : [enForm],
          ),
        },
      },
    }).getPage('baandoi.lumio.app', 'home', 'en');

    expect(page.forms[0]?.name).toBe('Contact us');
    expect(page.forms[0]?.successMessage).toBe('Thank you');
  });

  it('sends a language subdomain to that language', async () => {
    const siteFindUnique = vi.fn().mockResolvedValue(bilingualSite);
    const db = {
      domain: { findUnique: vi.fn().mockResolvedValue(null) },
      site: { findUnique: siteFindUnique },
      forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) =>
        fn(
          txWith({
            content: { findFirst: vi.fn().mockResolvedValue(contentRow({ locale: 'en' })) },
          }),
        ),
      ),
    } as unknown as PrismaService;

    const page = await new PublicService(db).getPage('en.baandoi.lumio.app', 'home');

    expect(siteFindUnique).toHaveBeenCalledWith({ where: { subdomain: 'baandoi' } });
    expect(page.locale).toBe('en');
  });

  it('ignores a language label the site does not offer', async () => {
    const siteFindUnique = vi.fn().mockResolvedValue(siteRow({ locales: ['th'] }));
    const db = {
      domain: { findUnique: vi.fn().mockResolvedValue(null) },
      site: { findUnique: siteFindUnique },
      forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) =>
        fn(
          txWith({
            content: { findFirst: vi.fn().mockResolvedValue(contentRow()) },
          }),
        ),
      ),
    } as unknown as PrismaService;

    await expect(new PublicService(db).getPage('en.baandoi.lumio.app', 'home')).rejects.toMatchObject(
      { code: 'not_found' },
    );
  });

  it('falls back to the default language for a language the site does not offer', async () => {
    const page = await service({
      domain: { hostname: 'baandoi.lumio.app', site: siteRow({ locales: ['th'] }) },
      tx: { content: { findFirst: vi.fn().mockResolvedValue(contentRow()) } },
    }).getPage('baandoi.lumio.app', 'home', 'de');

    expect(page.locale).toBe('th');
    expect(page.isFallback).toBe(false);
  });
});

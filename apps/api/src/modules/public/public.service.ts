import { Injectable } from '@nestjs/common';
import type { Content, Media, Prisma, Site } from '@prisma/client';
import {
  blockTreeSchema,
  buildSrcSet,
  HOME_SLUG,
  isContentType,
  isSupportedLocale,
  localePathFor,
  mediaUrlFor,
  mediaVariantsSchema,
  normalizeLocales,
  normalizeNotFoundPath,
  parseMenuItems,
  pickVariant,
  publicFormSchema,
  resolveVariantUrl,
  seoSchema,
  type BlockTree,
  type ContentType,
  type MenuItem,
  type PublicContent,
  type PublicForm,
  type PublicGlobalBlocks,
  type PublicLocales,
  type PublicMenus,
  type PublicPage,
  type PublicPostList,
  type PublicPostSummary,
  type PublicRedirect,
  type PublicSitemap,
  type PublicSitemapUrl,
  type PublicSite,
  type PublicTranslation,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { verifyPreviewToken } from '../../common/preview-token';
import { mediaPublicBaseUrl } from '../media/media.config';
import { PrismaService } from '../prisma/prisma.service';
import { resolveSiteByHost } from './resolve-site';
import { normalizeHost } from './host';

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const readBlocks = (value: unknown): BlockTree => {
  const parsed = blockTreeSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
};

const readSeo = (value: unknown) => {
  const parsed = seoSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : { noindex: false };
};

const readMenuItems = (value: unknown): MenuItem[] => parseMenuItems(value);

/** Ids of every managed form a block tree points at, children included. */
export const collectFormIds = (blocks: BlockTree): string[] => {
  const ids = new Set<string>();
  const walk = (nodes: BlockTree): void => {
    for (const node of nodes) {
      if (node.type === 'form') {
        const formId = node.props.formId;
        if (typeof formId === 'string' && formId.length > 0) ids.add(formId);
      }
      if (node.children.length > 0) walk(node.children);
    }
  };
  walk(blocks);
  return [...ids];
};

const readFocalPoint = (value: unknown): { x: number; y: number } | null => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const { x, y } = value as { x?: unknown; y?: unknown };
  return typeof x === 'number' && typeof y === 'number' ? { x, y } : null;
};

/** Every media id any block points at, including nested floats and galleries. */
export const collectBlockMediaIds = (value: unknown, ids = new Set<string>()): Set<string> => {
  if (Array.isArray(value)) {
    for (const entry of value) collectBlockMediaIds(entry, ids);
    return ids;
  }
  if (value === null || typeof value !== 'object') return ids;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key === 'mediaId' && typeof child === 'string' && child.length > 0) ids.add(child);
    else collectBlockMediaIds(child, ids);
  }
  return ids;
};

/**
 * Puts the media row's current files back into an image value. Blocks store the
 * urls they were picked with, so an image uploaded before its ladder existed
 * would otherwise stay a single soft file forever.
 */
const refreshImageValue = (
  value: Record<string, unknown>,
  media: Media,
  base: string,
): Record<string, unknown> => {
  if (media.status === 'trashed') return value;
  const parsed = mediaVariantsSchema.safeParse(media.variants);
  const variants = parsed.success ? parsed.data : [];
  if (variants.length === 0) return value;
  // The plain source stays WebP: it is the fallback for a browser that ignores srcSet.
  const webpVariants = variants.filter((variant) => variant.format === 'webp');
  const largest = pickVariant(
    webpVariants.length > 0 ? webpVariants : variants,
    Number.MAX_SAFE_INTEGER,
  );
  const webp = buildSrcSet(variants, base);
  const avif = buildSrcSet(variants, base, { format: 'avif' });
  const focal = readFocalPoint(media.focalPoint);
  return {
    ...value,
    ...(largest ? { src: resolveVariantUrl(largest, base) } : {}),
    ...(webp ? { srcSet: webp } : {}),
    ...(avif ? { avifSrcSet: avif } : {}),
    ...(typeof media.width === 'number' ? { width: media.width } : {}),
    ...(typeof media.height === 'number' ? { height: media.height } : {}),
    ...(value.focalPoint === undefined && focal ? { focalPoint: focal } : {}),
  };
};

const refreshBlockTree = (value: unknown, media: Map<string, Media>, base: string): unknown => {
  if (Array.isArray(value)) return value.map((entry) => refreshBlockTree(entry, media, base));
  if (value === null || typeof value !== 'object') return value;
  const record = Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      refreshBlockTree(child, media, base),
    ]),
  );
  const id = record.mediaId;
  const row = typeof id === 'string' ? media.get(id) : undefined;
  return row ? refreshImageValue(record, row, base) : record;
};

const toPublicSite = (
  site: Site,
  logoUrl: string | null = null,
  faviconUrl: string | null = null,
): PublicSite => ({
  id: site.id,
  name: site.name,
  subdomain: site.subdomain,
  localeDefault: site.localeDefault,
  locales: site.locales,
  themeTokens: asRecord(site.themeTokens),
  settings: asRecord(site.settings),
  logoUrl,
  faviconUrl,
});

interface MediaLike {
  storageKey: string;
  variants: unknown;
  status?: string;
}

const mediaBaseUrl = (): string => mediaPublicBaseUrl();

const toMediaUrl = (media: MediaLike | null | undefined): string | null => {
  // Soft-deleted media keeps its files for the undo window but must not be
  // linked from the public site.
  if (!media || media.status === 'trashed') return null;
  const variants = Array.isArray(media.variants) ? media.variants : [];
  const first = asRecord(variants[0]);
  const key = typeof first.url === 'string' && first.url.length > 0 ? first.url : media.storageKey;
  return mediaUrlFor(mediaBaseUrl(), key);
};

const toPublicContent = (row: Content, cover: Media | null): PublicContent => ({
  id: row.id,
  type: isContentType(row.type) ? row.type : 'page',
  title: row.title,
  slug: row.slug,
  locale: row.locale,
  excerpt: row.excerpt,
  seo: readSeo(row.seo),
  blocks: readBlocks(row.blocksPublished),
  publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
  updatedAt: row.updatedAt.toISOString(),
  coverImage: toMediaUrl(cover),
});

const toPostSummary = (row: Content, cover: Media | null): PublicPostSummary => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  excerpt: row.excerpt,
  publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
  coverImage: toMediaUrl(cover),
});

interface ResolvedSite {
  /** Raw row: `logoUrl` still has to be resolved inside the site transaction. */
  row: Site;
  siteId: string;
  /** Language taken from a subdomain such as `en.baandoi.example.com`, if any. */
  localeFromHost: string | null;
}

type ContentRow = Content & { coverMedia: Media | null };

/**
 * Read-only delivery of published content to the public renderer
 * (docs/design/12-api.md 12.7). Nothing here writes; every site-scoped query
 * still runs inside `forSite`, so RLS keeps tenants apart even though these
 * routes are anonymous.
 */
@Injectable()
export class PublicService {
  constructor(private readonly db: PrismaService) {}

  /**
   * Languages this host offers, plus the language a subdomain asked for. The
   * renderer's middleware calls it before honouring `Accept-Language`, so a
   * visitor is never sent to a language the site does not have
   * (docs/design/17-i18n.md 17.1).
   */
  async locales(host: string): Promise<PublicLocales> {
    const resolved = await this.resolveSite(host);
    return {
      locales: normalizeLocales(resolved.row.locales, resolved.row.localeDefault),
      defaultLocale: resolved.row.localeDefault,
      localeFromHost: resolved.localeFromHost,
    };
  }

  /**
   * Site, navigation and header/footer for pages that are not a single content
   * row (the shop, cart and order screens share the same chrome).
   */
  async chrome(
    host: string,
    locale?: string,
  ): Promise<{
    siteId: string;
    site: PublicSite;
    menus: PublicMenus;
    globalBlocks: PublicGlobalBlocks;
    locale: string;
  }> {
    const resolved = await this.resolveSite(host);
    return this.db.forSite(resolved.siteId, async (tx) => {
      const site = await this.publicSite(tx, resolved.row);
      const requested = this.requestedLocale(site, locale, resolved.localeFromHost);
      return {
        siteId: resolved.siteId,
        site,
        menus: await this.readMenus(tx, requested),
        globalBlocks: await this.readGlobalBlocks(tx),
        locale: requested,
      };
    });
  }

  async getPage(host: string, slug: string, locale?: string): Promise<PublicPage> {
    return this.getContent(host, 'page', slug, locale);
  }

  async getPost(host: string, slug: string, locale?: string): Promise<PublicPage> {
    return this.getContent(host, 'post', slug, locale);
  }

  /**
   * One page as its editor currently sees it, reached only through a signed
   * preview token (docs/design/10-architecture.md 10.4 step 3). The response is
   * the same shape as a published page so the renderer reuses every component;
   * `seo.noindex` is forced on and the endpoint is never cached.
   */
  async preview(token: string): Promise<PublicPage> {
    const claim = verifyPreviewToken(token);
    if (!claim) throw ApiException.notFound('ลิงก์ตัวอย่างหมดอายุหรือไม่ถูกต้อง');

    const siteRow = await this.db.forSite(claim.siteId, (tx) =>
      tx.site.findUnique({ where: { id: claim.siteId } }),
    );
    if (!siteRow) throw ApiException.notFound('ลิงก์ตัวอย่างหมดอายุหรือไม่ถูกต้อง');

    return this.db.forSite(claim.siteId, async (tx) => {
      const row = await tx.content.findUnique({
        where: { id: claim.contentId },
        include: { coverMedia: true },
      });
      if (!row || row.siteId !== claim.siteId) {
        throw ApiException.notFound('ลิงก์ตัวอย่างหมดอายุหรือไม่ถูกต้อง');
      }

      const site = await this.publicSite(tx, siteRow);
      const menus = await this.readMenus(tx, row.locale);
      const globalBlocks = await this.readGlobalBlocks(tx);
      const published = toPublicContent(row, row.coverMedia);
      const images = await this.refreshBlockImages(tx, readBlocks(row.blocksDraft), globalBlocks);
      const blocks = images.blocks;
      const content = {
        ...published,
        blocks,
        seo: { ...readSeo(row.seo), noindex: true },
      };

      return {
        site,
        content,
        menus,
        globalBlocks: images.globalBlocks,
        forms: await this.readForms(tx, collectFormIds(blocks), row.locale),
        locale: row.locale,
        isFallback: false,
        translations: [],
        redirect: null,
      };
    });
  }

  async listPosts(host: string, limit: number, locale?: string): Promise<PublicPostList> {
    const resolved = await this.resolveSite(host);

    return this.db.forSite(resolved.siteId, async (tx) => {
      const site = await this.publicSite(tx, resolved.row);
      const requested = this.requestedLocale(site, locale, resolved.localeFromHost);
      const menus = await this.readMenus(tx, requested);
      const globalBlocks = await this.readGlobalBlocks(tx);
      const readPosts = (language: string) =>
        tx.content.findMany({
          where: { type: 'post', status: 'published', locale: language },
          orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
          take: limit,
          include: { coverMedia: true },
        });

      let effective = requested;
      let rows = await readPosts(requested);
      // No posts in the requested language: show the default language instead.
      if (rows.length === 0 && requested !== site.localeDefault) {
        effective = site.localeDefault;
        rows = await readPosts(site.localeDefault);
      }

      return {
        site,
        menus,
        globalBlocks,
        locale: effective,
        posts: rows.map((row) => toPostSummary(row, row.coverMedia)),
      };
    });
  }

  /** Everything the renderer needs to emit `sitemap.xml`. */
  async sitemap(host: string): Promise<PublicSitemap> {
    const resolved = await this.resolveSite(host);
    const defaultLocale = resolved.row.localeDefault;

    const rows = await this.db.forSite(resolved.siteId, (tx) =>
      tx.content.findMany({
        where: { status: 'published' },
        orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
        select: {
          id: true,
          type: true,
          slug: true,
          title: true,
          locale: true,
          translationGroupId: true,
          updatedAt: true,
          seo: true,
        },
      }),
    );

    const groupOf = (row: (typeof rows)[number]): string => row.translationGroupId ?? row.id;

    const urls: PublicSitemapUrl[] = [];
    for (const row of rows) {
      if (readSeo(row.seo).noindex) continue;

      const type = isContentType(row.type) ? row.type : 'page';
      // Every language of the same page, so the renderer can emit `hreflang`.
      const siblings = rows.filter(
        (other) =>
          other.type === row.type && groupOf(other) === groupOf(row) && !readSeo(other.seo).noindex,
      );

      urls.push({
        path: localePathFor(type, row.slug, row.locale, defaultLocale),
        lastmod: row.updatedAt.toISOString(),
        type,
        alternates: siblings.map((sibling) => ({
          locale: sibling.locale,
          path: localePathFor(type, sibling.slug, sibling.locale, defaultLocale),
          title: sibling.title,
          available: true,
        })),
      });
    }

    const products = await this.db.forSite(resolved.siteId, (tx) =>
      tx.product.findMany({
        where: { status: 'active' },
        select: { slug: true, updatedAt: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
    );

    return {
      site: toPublicSite(resolved.row),
      urls,
      shop: products.map((product) => ({
        path: `/shop/${product.slug}`,
        lastmod: product.updatedAt.toISOString(),
      })),
    };
  }

  /**
   * Replaces image values with the media row's newest ladder, so a page that
   * picked a picture while it was still rendering becomes sharp again without
   * the owner re-picking it. One query for the whole page, header and footer.
   */
  private async refreshBlockImages(
    tx: Prisma.TransactionClient,
    blocks: BlockTree,
    globalBlocks: PublicGlobalBlocks,
  ): Promise<{ blocks: BlockTree; globalBlocks: PublicGlobalBlocks }> {
    const ids = collectBlockMediaIds([blocks, globalBlocks.header, globalBlocks.footer]);
    if (ids.size === 0) return { blocks, globalBlocks };

    const rows = await tx.media.findMany({ where: { id: { in: [...ids] } } });
    if (rows.length === 0) return { blocks, globalBlocks };

    const media = new Map(rows.map((row) => [row.id, row]));
    const base = mediaPublicBaseUrl();
    return {
      blocks: refreshBlockTree(blocks, media, base) as BlockTree,
      globalBlocks: {
        header: refreshBlockTree(globalBlocks.header, media, base) as BlockTree,
        footer: refreshBlockTree(globalBlocks.footer, media, base) as BlockTree,
      },
    };
  }

  private async getContent(
    host: string,
    type: ContentType,
    slug: string,
    locale?: string,
  ): Promise<PublicPage> {
    const resolved = await this.resolveSite(host);

    return this.db.forSite(resolved.siteId, async (tx) => {
      const site = await this.publicSite(tx, resolved.row);
      const requested = this.requestedLocale(site, locale, resolved.localeFromHost);
      // Menus follow the language that was asked for, not the one that ended up
      // being served, so a fallback page still shows the requested navigation.
      const menus = await this.readMenus(tx, requested);
      const globalBlocks = await this.readGlobalBlocks(tx);

      const findIn = async (language: string): Promise<ContentRow | null> =>
        (await tx.content.findFirst({
          where: { type, status: 'published', locale: language, slug },
          include: { coverMedia: true },
        })) as ContentRow | null;

      let row = await findIn(requested);
      let isFallback = false;
      // A language without a page falls back to the default one (docs 17.4 rule 4).
      if (!row && requested !== site.localeDefault) {
        row = await findIn(site.localeDefault);
        isFallback = row !== null;
      }

      if (row) {
        const published = toPublicContent(row, row.coverMedia);
        const images = await this.refreshBlockImages(tx, published.blocks, globalBlocks);
        const content = { ...published, blocks: images.blocks };
        return {
          site,
          content,
          menus,
          globalBlocks: images.globalBlocks,
          forms: await this.readForms(tx, collectFormIds(content.blocks), row.locale),
          locale: row.locale,
          isFallback,
          translations: await this.buildTranslations(tx, row, site),
          redirect: null,
        };
      }

      const redirect = await this.findRedirect(tx, type, slug, requested, site.localeDefault);
      if (redirect) {
        return {
          site,
          content: null,
          menus,
          globalBlocks,
          forms: [],
          locale: requested,
          isFallback: false,
          translations: [],
          redirect,
        };
      }

      throw ApiException.notFound('ไม่พบหน้านี้');
    });
  }

  /**
   * Every language of a page (docs/design/17-i18n.md 17.3): the ones that exist
   * with a path to open, plus the offered ones that do not (so the switcher can
   * disable them instead of linking to a dead page).
   */
  private async buildTranslations(
    tx: Prisma.TransactionClient,
    row: ContentRow,
    site: PublicSite,
  ): Promise<PublicTranslation[]> {
    const groupId = row.translationGroupId ?? row.id;
    const type = isContentType(row.type) ? row.type : 'page';

    const siblings = await tx.content.findMany({
      where: {
        type: row.type,
        status: 'published',
        OR: [{ id: groupId }, { translationGroupId: groupId }],
      },
      select: { locale: true, slug: true, title: true },
    });
    // The served page is always one of its own languages, even if the sibling
    // query came back empty (e.g. a row that predates the group column).
    const known =
      siblings.length > 0
        ? siblings
        : [{ locale: row.locale, slug: row.slug, title: row.title }];

    return site.locales.map((language) => {
      const match = known.find((sibling) => sibling.locale === language);
      return {
        locale: language,
        path: localePathFor(type, match?.slug ?? row.slug, language, site.localeDefault),
        title: match?.title ?? null,
        available: Boolean(match),
      };
    });
  }

  /**
   * Effective language of a request: an explicit `?locale=` wins, then the
   * language subdomain, and anything the site does not offer falls back to the
   * default (docs/design/17-i18n.md 17.1).
   */
  private requestedLocale(site: PublicSite, requested?: string, fromHost?: string | null): string {
    const offered = normalizeLocales(site.locales, site.localeDefault);
    const candidate = (requested ?? fromHost ?? '').trim().toLowerCase();
    return candidate.length > 0 && offered.includes(candidate) ? candidate : site.localeDefault;
  }

  /**
   * Contact forms the page renders, so the renderer draws them without a second call.
   * A form written for another language is swapped for its sibling in the
   * requested language when there is one (docs/design/17-i18n.md 17.5).
   */
  private async readForms(
    tx: Prisma.TransactionClient,
    formIds: readonly string[],
    locale: string,
  ): Promise<PublicForm[]> {
    if (formIds.length === 0) return [];

    const fields = {
      id: true,
      name: true,
      fields: true,
      successMessage: true,
      locale: true,
      translationGroupId: true,
    } as const;

    const rows = await tx.form.findMany({ where: { id: { in: [...formIds] } }, select: fields });
    const groups = rows
      .map((row) => row.translationGroupId)
      .filter((value): value is string => typeof value === 'string' && value.length > 0);
    const siblings =
      groups.length === 0
        ? []
        : await tx.form.findMany({
            where: { translationGroupId: { in: groups } },
            select: fields,
          });

    return rows.flatMap((row) => {
      const candidates = [row, ...siblings.filter((s) => s.translationGroupId === row.translationGroupId)];
      const chosen =
        candidates.find((candidate) => candidate.locale === locale) ??
        candidates.find((candidate) => candidate.locale === null) ??
        row;

      const parsed = publicFormSchema.safeParse({
        id: chosen.id,
        name: chosen.name ?? 'ฟอร์มติดต่อ',
        fields: chosen.fields,
        successMessage: chosen.successMessage ?? '',
      });
      return parsed.success ? [parsed.data] : [];
    });
  }

  /** Site payload plus the brand images the owner uploaded, when there are any. */
  private async publicSite(tx: Prisma.TransactionClient, row: Site): Promise<PublicSite> {
    const settings = asRecord(row.settings);
    const ids = [settings.logoMediaId, settings.faviconMediaId].flatMap((value) =>
      typeof value === 'string' && value.length > 0 ? [value] : [],
    );
    if (ids.length === 0) return toPublicSite(row);

    const rows = await tx.media.findMany({
      where: { id: { in: ids } },
      select: { id: true, storageKey: true, variants: true, status: true },
    });
    const urlOf = (value: unknown): string | null => {
      if (typeof value !== 'string') return null;
      return toMediaUrl(rows.find((media) => media.id === value) ?? null);
    };
    return toPublicSite(row, urlOf(settings.logoMediaId), urlOf(settings.faviconMediaId));
  }

  /** Header/footer are global blocks, rendered on every page (design 8.3). */
  private async readGlobalBlocks(tx: Prisma.TransactionClient): Promise<PublicGlobalBlocks> {
    const rows = await tx.globalBlock.findMany({
      where: { kind: { in: ['header', 'footer'] } },
      select: { kind: true, blocks: true },
    });

    const globalBlocks: PublicGlobalBlocks = { header: [], footer: [] };
    for (const row of rows) {
      if (row.kind === 'header') globalBlocks.header = readBlocks(row.blocks);
      if (row.kind === 'footer') globalBlocks.footer = readBlocks(row.blocks);
    }
    return globalBlocks;
  }

  /**
   * Menus for one language: a language-specific row wins over the menu that
   * serves every language (docs/design/17-i18n.md 17.5).
   */
  private async readMenus(tx: Prisma.TransactionClient, locale: string): Promise<PublicMenus> {
    const rows = await tx.menu.findMany({
      where: { location: { in: ['header', 'footer'] }, OR: [{ locale }, { locale: null }] },
      select: { location: true, items: true, locale: true },
    });

    const menus: PublicMenus = { header: [], footer: [] };
    const chosen: Record<string, string | null> = {};
    for (const row of rows) {
      if (row.location !== 'header' && row.location !== 'footer') continue;
      // Prefer the language-specific row, and never let the shared one overwrite it.
      const isSpecific = row.locale === locale;
      if (chosen[row.location] === locale && !isSpecific) continue;
      menus[row.location] = readMenuItems(row.items);
      chosen[row.location] = row.locale;
    }
    return menus;
  }

  private async findRedirect(
    tx: Prisma.TransactionClient,
    type: ContentType,
    slug: string,
    locale: string,
    defaultLocale: string,
  ): Promise<PublicRedirect | null> {
    const candidates =
      type === 'page' && slug === HOME_SLUG ? ['/', '/home'] : [`/${slug}`, slug];

    // The manager stores the address as the visitor types it, so a page that
    // moved inside a translated site keeps its language prefix (`/en/about-us`).
    if (locale !== defaultLocale) {
      candidates.push(
        ...(type === 'page' && slug === HOME_SLUG
          ? [`/${locale}`, `/${locale}/home`]
          : [`/${locale}/${slug}`]),
      );
    }

    const row = await tx.redirect.findFirst({
      where: { fromPath: { in: candidates } },
      select: { toPath: true, code: true },
    });

    return row ? { to: row.toPath, code: row.code } : null;
  }

  /**
   * Resolves the tenant from the request host (see {@link resolveSiteByHost}):
   * a verified custom domain first, then the free `*.example.com` subdomain.
   *
   * A language subdomain (`en.baandoi.example.com`, docs/design/17-i18n.md 17.1)
   * is tried second: the label is only accepted when the resolved site actually
   * offers that language, so a host that merely starts with `en.` still has to
   * be a real site.
   */
  private async resolveSite(host: string): Promise<ResolvedSite> {
    try {
      const site = await resolveSiteByHost(this.db, host);
      return { siteId: site.id, row: site, localeFromHost: null };
    } catch (error) {
      const hostname = normalizeHost(host);
      const [label, ...rest] = hostname.split('.');
      if (!label || rest.length < 2 || !isSupportedLocale(label)) throw error;

      const site = await resolveSiteByHost(this.db, rest.join('.'));
      if (!normalizeLocales(site.locales, site.localeDefault).includes(label)) throw error;
      return { siteId: site.id, row: site, localeFromHost: label };
    }
  }
  /**
   * Counts an address that reached the renderer's 404 (docs/design/14-seo-performance.md
   * 14.1). Only the path is stored; a forged host or noise never creates a row.
   */
  async recordNotFound(host: string, path: string): Promise<void> {
    const normalized = normalizeNotFoundPath(path);
    if (!normalized) return;

    const site = await resolveSiteByHost(this.db, host);
    const now = new Date();
    await this.db.forSite(site.id, (tx) =>
      tx.notFound.upsert({
        where: { siteId_path: { siteId: site.id, path: normalized } },
        create: { siteId: site.id, path: normalized, hits: 1, lastSeenAt: now },
        update: { hits: { increment: 1 }, lastSeenAt: now },
      }),
    );
  }

}

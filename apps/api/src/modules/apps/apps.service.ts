import { Injectable } from '@nestjs/common';
import type { Prisma, SiteApp as SiteAppRow } from '@prisma/client';
import {
  APP_CATALOG,
  APP_INSTALLED_FALLBACK,
  externalAppInputSchema,
  externalAppManifestSchema,
  findCatalogApp,
  localizeCatalogApp,
  type ApiLocale,
  type AppStoreEntry,
  type ExternalAppManifest,
  type InstallAppInput,
  type InstalledApp,
  type UpdateInstalledAppInput,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppManifestService } from './app-manifest.service';
import { appsPlatformDisabled, externalAppsEnabled } from './apps.config';

const asConfig = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

/** The stored manifest of an external App, or null for a catalog App. */
export const readAppManifest = (value: unknown): ExternalAppManifest | null => {
  const parsed = externalAppManifestSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

const toInstalled = (row: SiteAppRow, locale: ApiLocale = 'th'): InstalledApp => {
  const manifest = readAppManifest(row.manifest);
  if (manifest) {
    return {
      key: row.appKey,
      name: manifest.name,
      description: manifest.description,
      category: manifest.category,
      permissions: manifest.permissions,
      enabled: row.enabled,
      config: asConfig(row.config),
      installedAt: row.createdAt.toISOString(),
      source: 'external',
      entry: manifest.entry,
      manifestUrl: row.manifestUrl,
      version: manifest.version,
    };
  }

  const catalog = findCatalogApp(row.appKey);
  const localized = catalog ? localizeCatalogApp(catalog, locale) : null;
  return {
    key: row.appKey,
    name: localized?.name ?? row.appKey,
    description: localized?.description ?? APP_INSTALLED_FALLBACK[locale],
    category: catalog?.category ?? 'content',
    permissions: catalog?.permissions ?? [],
    enabled: row.enabled,
    config: asConfig(row.config),
    installedAt: row.createdAt.toISOString(),
    source: 'catalog',
    entry: null,
    manifestUrl: null,
    version: null,
  };
};

/**
 * The App store for one site (docs/design/16-apps.md, 05-admin-ia.md
 * "เติบโต › Apps"). First-party Apps come from the code catalog; a developer can
 * also host a manifest, which is validated once at install time and stored with
 * the site, so a reload never depends on the developer's server. Installing only
 * records which Apps this site has, so a site can never see another site's
 * installs (RLS).
 */
@Injectable()
export class AppsService {
  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
    private readonly manifests: AppManifestService = new AppManifestService(),
  ) {}

  /** Every App in the store, flagged with whether this site already has it. */
  async store(siteId: string, locale: ApiLocale = 'th'): Promise<AppStoreEntry[]> {
    const rows = await this.db.forSite(siteId, (tx) => tx.siteApp.findMany());
    const byKey = new Map(rows.map((row) => [row.appKey, row]));

    const catalogEntries: AppStoreEntry[] = APP_CATALOG.map((app) => {
      const installed = byKey.get(app.key);
      return {
        ...localizeCatalogApp(app, locale),
        installed: Boolean(installed),
        enabled: installed?.enabled ?? false,
        source: 'catalog',
        entry: null,
        manifestUrl: null,
      };
    });

    const externalEntries = rows
      .filter((row) => row.source === 'external')
      .map((row) => ({ row, manifest: readAppManifest(row.manifest) }))
      .filter(
        (entry): entry is { row: SiteAppRow; manifest: ExternalAppManifest } =>
          entry.manifest !== null,
      )
      .map<AppStoreEntry>(({ row, manifest }) => ({
        key: row.appKey,
        name: manifest.name,
        description: manifest.description,
        category: manifest.category,
        permissions: manifest.permissions,
        installed: true,
        enabled: row.enabled,
        source: 'external',
        entry: manifest.entry,
        manifestUrl: row.manifestUrl,
      }));

    return [...catalogEntries, ...externalEntries];
  }

  async listInstalled(siteId: string, locale: ApiLocale = 'th'): Promise<InstalledApp[]> {
    const rows = await this.db.forSite(siteId, (tx) =>
      tx.siteApp.findMany({ orderBy: [{ createdAt: 'desc' }] }),
    );
    return rows.map((row) => toInstalled(row, locale));
  }

  async install(
    siteId: string,
    appKey: string,
    input: InstallAppInput,
    actorId: string,
    locale: ApiLocale = 'th',
  ): Promise<InstalledApp> {
    if (appsPlatformDisabled()) {
      throw ApiException.forbidden('ขณะนี้ระบบปิดการติดตั้ง App ชั่วคราว กรุณาลองใหม่ภายหลัง');
    }
    const catalog = findCatalogApp(appKey);
    if (!catalog) throw ApiException.notFound('ไม่พบ App นี้ในคลัง');

    const row = await this.db.forSite(siteId, async (tx) => {
      const existing = await tx.siteApp.findUnique({
        where: { siteId_appKey: { siteId, appKey } },
        select: { siteId: true },
      });
      if (existing) throw ApiException.conflict('App นี้ติดตั้งไว้แล้ว');

      const created = await tx.siteApp.create({
        data: { siteId, appKey, source: 'catalog', config: asJson(input.config), enabled: true },
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'app.install',
          target: appKey,
          meta: { name: catalog.name, permissions: catalog.permissions },
        },
      });

      return created;
    });

    return toInstalled(row, locale);
  }

  /**
   * Installs an App whose manifest lives on a developer's server. The manifest is
   * fetched again here (never trusted from the browser), validated, and stored in
   * site scope; the entry page is the absolute URL the sandbox loads.
   */
  async installExternal(
    siteId: string,
    input: unknown,
    actorId: string,
    locale: ApiLocale = 'th',
  ): Promise<InstalledApp> {
    if (appsPlatformDisabled()) {
      throw ApiException.forbidden('ขณะนี้ระบบปิดการติดตั้ง App ชั่วคราว กรุณาลองใหม่ภายหลัง');
    }
    if (!externalAppsEnabled()) {
      throw ApiException.forbidden('ระบบยังไม่เปิดรับ App จากภายนอก');
    }

    const { url } = externalAppInputSchema.parse(input);
    const preview = await this.manifests.preview(url);
    const manifest = preview.manifest;

    if (findCatalogApp(manifest.key)) {
      throw ApiException.conflict('ชื่อ key นี้ใช้กับ App ของระบบ กรุณาตั้งชื่อใหม่');
    }

    const row = await this.db.forSite(siteId, async (tx) => {
      const existing = await tx.siteApp.findUnique({
        where: { siteId_appKey: { siteId, appKey: manifest.key } },
        select: { siteId: true },
      });
      if (existing) throw ApiException.conflict('App นี้ติดตั้งไว้แล้ว');

      const created = await tx.siteApp.create({
        data: {
          siteId,
          appKey: manifest.key,
          source: 'external',
          manifestUrl: preview.manifestUrl,
          manifest: asJson({ ...manifest, entry: preview.entry }),
          config: {},
          enabled: true,
        },
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'app.install_external',
          target: manifest.key,
          meta: {
            name: manifest.name,
            version: manifest.version,
            manifestUrl: preview.manifestUrl,
            permissions: manifest.permissions,
          },
        },
      });

      return created;
    });

    return toInstalled(row, locale);
  }

  async update(
    siteId: string,
    appKey: string,
    input: UpdateInstalledAppInput,
    actorId: string,
    locale: ApiLocale = 'th',
  ): Promise<InstalledApp> {
    const row = await this.db.forSite(siteId, async (tx) => {
      const existing = await tx.siteApp.findUnique({
        where: { siteId_appKey: { siteId, appKey } },
        select: { appKey: true },
      });
      if (!existing) throw ApiException.notFound('App นี้ยังไม่ได้ติดตั้ง');

      const updated = await tx.siteApp.update({
        where: { siteId_appKey: { siteId, appKey } },
        data: {
          enabled: input.enabled ?? undefined,
          config: input.config === undefined ? undefined : asJson(input.config),
        },
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'app.update',
          target: appKey,
          meta: { enabled: updated.enabled, changed: Object.keys(input) },
        },
      });

      return updated;
    });

    return toInstalled(row, locale);
  }

  async remove(siteId: string, appKey: string, actorId: string): Promise<void> {
    await this.db.forSite(siteId, async (tx) => {
      const existing = await tx.siteApp.findUnique({
        where: { siteId_appKey: { siteId, appKey } },
        select: { appKey: true },
      });
      if (!existing) throw ApiException.notFound('App นี้ยังไม่ได้ติดตั้ง');

      await tx.siteApp.delete({ where: { siteId_appKey: { siteId, appKey } } });
      await tx.auditLog.create({
        data: { siteId, userId: actorId, action: 'app.uninstall', target: appKey },
      });
    });
  }
}

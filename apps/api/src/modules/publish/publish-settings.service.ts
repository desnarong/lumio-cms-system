import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  emptyPublishSettings,
  isPrivateHostname,
  readStoredPublishSettings,
  type PublishSettingsInput,
  type PublishSettingsView,
  type StoredPublishSettings,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import { decryptSecret, encryptSecret } from '../../common/secret-box';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

/** Everything the publish pipeline needs for one site, secrets already decrypted. */
export interface PublishRuntimeConfig {
  rendererUrl: string;
  staticPublishUrl: string;
  staticPublishSecret: string;
  cdnPurgeUrl: string;
  cdnPurgeSecret: string;
  purgeOnPublish: boolean;
}

const emptyStored = (): StoredPublishSettings => ({
  ...emptyPublishSettings(),
  lastRun: null,
  updatedAt: new Date(0).toISOString(),
});

const hostOf = (address: string): string => {
  try {
    return new URL(address).hostname;
  } catch {
    return '';
  }
};

/**
 * Site-owned publishing setup (docs/design/03-scope.md "Publish แล้วได้ static
 * HTML บน CDN"). The owner pastes the addresses and keys of their own static
 * host and CDN into the admin, so no deployment has to edit `.env` before a
 * customer can publish.
 *
 * Keys are encrypted with the installation key (`secret-box.ts`) and never
 * returned; the screen only learns whether one is stored.
 */
@Injectable()
export class PublishSettingsService {
  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async view(siteId: string): Promise<PublishSettingsView> {
    return this.toView(readStoredPublishSettings(await this.readSiteSettings(siteId)));
  }

  async update(
    siteId: string,
    input: PublishSettingsInput,
    actorId: string,
  ): Promise<PublishSettingsView> {
    const staticHost = hostOf(input.staticPublishUrl);
    const purgeHost = hostOf(input.cdnPurgeUrl);
    this.assertPublicEndpoint(staticHost, input.staticPublishUrl);
    this.assertPublicEndpoint(purgeHost, input.cdnPurgeUrl);

    const stored = await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({
        where: { id: siteId },
        select: { settings: true },
      });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');

      const existing = readStoredPublishSettings(site.settings) ?? emptyStored();
      const merged = this.mergeInput(input, existing);

      await tx.site.update({
        where: { id: siteId },
        data: { settings: asJson({ ...asRecord(site.settings), publish: merged }) },
      });
      return merged;
    });

    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'publish.settings.update',
      target: siteId,
      meta: {
        rendererUrl: stored.rendererUrl,
        staticPublishUrl: stored.staticPublishUrl,
        cdnPurgeUrl: stored.cdnPurgeUrl,
        purgeOnPublish: stored.purgeOnPublish,
      },
    });

    return this.toView(stored);
  }

  /**
   * The configuration the pipeline uses. A site that has not opened the screen
   * yet falls back to the deployment values, so existing installs keep working.
   */
  async config(siteId: string): Promise<PublishRuntimeConfig> {
    const stored = readStoredPublishSettings(await this.readSiteSettings(siteId));

    return {
      rendererUrl: (stored?.rendererUrl || process.env.RENDERER_URL || '')
        .trim()
        .replace(/\/+$/, ''),
      staticPublishUrl: (stored?.staticPublishUrl ?? '').trim(),
      staticPublishSecret: this.secretOf(stored?.staticPublishSecret, process.env.CDN_PUBLISH_SECRET),
      cdnPurgeUrl: (stored?.cdnPurgeUrl ?? '').trim(),
      cdnPurgeSecret: this.secretOf(stored?.cdnPurgeSecret, process.env.CDN_PURGE_SECRET),
      purgeOnPublish: stored?.purgeOnPublish ?? true,
    };
  }

  /**
   * Remembers how long the last static write took. The screen shows it, so the
   * owner can check the 10-second target from docs/design/03-scope.md without
   * reading server logs.
   */
  async recordRun(
    siteId: string,
    run: { durationMs: number; delivered: boolean; failures: string[] },
  ): Promise<void> {
    const site = await this.db.forSite(siteId, (tx) =>
      tx.site.findUnique({ where: { id: siteId }, select: { settings: true } }),
    );
    if (!site) return;

    const stored = readStoredPublishSettings(site.settings);
    if (!stored) return;

    const next: StoredPublishSettings = {
      ...stored,
      lastRun: {
        at: new Date().toISOString(),
        durationMs: Math.max(0, Math.round(run.durationMs)),
        delivered: run.delivered,
        failures: run.failures.slice(0, 20),
      },
      updatedAt: stored.updatedAt,
    };

    await this.db.forSite(siteId, (tx) =>
      tx.site.update({
        where: { id: siteId },
        data: { settings: asJson({ ...asRecord(site.settings), publish: next }) },
      }),
    );
  }

  private secretOf(stored: string | undefined, fallback: string | undefined): string {
    if (stored && stored.length > 0) {
      try {
        return decryptSecret(stored);
      } catch {
        return '';
      }
    }
    return (fallback ?? '').trim();
  }

  private mergeInput(
    input: PublishSettingsInput,
    existing: StoredPublishSettings,
  ): StoredPublishSettings {
    const staticPublishSecret =
      input.clearStaticPublishSecret === true
        ? undefined
        : input.staticPublishSecret && input.staticPublishSecret.length > 0
          ? encryptSecret(input.staticPublishSecret)
          : existing.staticPublishSecret;

    const cdnPurgeSecret =
      input.clearCdnPurgeSecret === true
        ? undefined
        : input.cdnPurgeSecret && input.cdnPurgeSecret.length > 0
          ? encryptSecret(input.cdnPurgeSecret)
          : existing.cdnPurgeSecret;

    return {
      rendererUrl: input.rendererUrl,
      staticPublishUrl: input.staticPublishUrl,
      staticPublishSecret,
      cdnPurgeUrl: input.cdnPurgeUrl,
      cdnPurgeSecret,
      purgeOnPublish: input.purgeOnPublish,
      lastRun: existing.lastRun,
      updatedAt: new Date().toISOString(),
    };
  }

  private toView(stored: StoredPublishSettings | null): PublishSettingsView {
    const value = stored ?? emptyStored();
    const staticReady = value.staticPublishUrl.length > 0 && value.rendererUrl.length > 0;

    return {
      rendererUrl: value.rendererUrl,
      staticPublishUrl: value.staticPublishUrl,
      hasStaticPublishSecret: Boolean(value.staticPublishSecret),
      cdnPurgeUrl: value.cdnPurgeUrl,
      hasCdnPurgeSecret: Boolean(value.cdnPurgeSecret),
      purgeOnPublish: value.purgeOnPublish,
      staticReady,
      purgeReady: value.purgeOnPublish && value.cdnPurgeUrl.length > 0,
      lastRun: value.lastRun,
      updatedAt: stored ? value.updatedAt : null,
    };
  }

  /**
   * Upload and purge addresses are called by the server, so an owner could
   * otherwise make it probe the internal network (docs/design/15-security.md).
   * Loopback stays available in development for a local static host.
   */
  private assertPublicEndpoint(host: string, address: string): void {
    if (address.length === 0) return;
    if (process.env.NODE_ENV !== 'production') return;
    if (!host || isPrivateHostname(host)) {
      throw ApiException.validation('ที่อยู่ต้องเป็นเซิร์ฟเวอร์บนอินเทอร์เน็ต ไม่ใช่เครือข่ายภายใน');
    }
  }

  private async readSiteSettings(siteId: string): Promise<unknown> {
    const site = await this.db.forSite(siteId, (tx) =>
      tx.site.findUnique({ where: { id: siteId }, select: { settings: true } }),
    );
    if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
    return site.settings;
  }
}

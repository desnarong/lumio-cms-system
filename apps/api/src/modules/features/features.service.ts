import { Injectable } from '@nestjs/common';
import {
  FEATURE_FLAG_KEYS,
  FEATURE_FLAG_META,
  isFeatureOn,
  licenseCoversFeature,
  normalizeFeatureFlags,
  parseDisabledFeatures,
  siteFeatureFlagsFromSettings,
  type FeatureFlagKey,
  type FeatureFlagList,
  type FeatureFlagView,
  type LicenseFeature,
  type LicenseStatus,
  type SiteFeatureFlags,
  type UpdateFeatureFlagsInput,
} from '@lumio/shared';
import type { Prisma } from '@prisma/client';
import { ApiException } from '../../common/api-error';
import { AuditService } from '../audit/audit.service';
import { LicenseService } from '../license/license.service';
import { PrismaService } from '../prisma/prisma.service';

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/**
 * Feature flags of one site (docs/design/03-scope.md 3.6). A site may close a
 * phase 2–3 capability on its own; the platform can close it for everyone with
 * `LUMIO_DISABLED_FEATURES`, and that switch always wins.
 */
@Injectable()
export class FeaturesService {
  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
    private readonly license: LicenseService,
  ) {}

  /** Flags the platform closed for every site, from the environment. */
  platformDisabled(): FeatureFlagKey[] {
    return parseDisabledFeatures(process.env.LUMIO_DISABLED_FEATURES);
  }

  async flags(siteId: string): Promise<SiteFeatureFlags> {
    const site = await this.db.forSite(siteId, (tx) =>
      tx.site.findUnique({ where: { id: siteId }, select: { settings: true } }),
    );
    if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');
    return siteFeatureFlagsFromSettings(site.settings);
  }

  async list(siteId: string): Promise<FeatureFlagList> {
    const [flags, disabled] = await Promise.all([this.flags(siteId), this.platformDisabled()]);
    return { items: this.views(flags, disabled, this.license.status()) };
  }

  async update(
    siteId: string,
    input: UpdateFeatureFlagsInput,
    actorId: string,
  ): Promise<FeatureFlagList> {
    const disabled = this.platformDisabled();
    const requested = normalizeFeatureFlags(input.flags);

    const status = this.license.status();
    for (const [key, enabled] of Object.entries(requested)) {
      if (!enabled) continue;
      const meta = FEATURE_FLAG_META[key as FeatureFlagKey];
      if (disabled.includes(key as FeatureFlagKey)) {
        throw ApiException.conflict(`ส่วน “${meta.label}” ถูกปิดโดยผู้ดูแลระบบ จึงเปิดเองไม่ได้`);
      }
      if (!this.unlocked(key as FeatureFlagKey, status)) {
        throw ApiException.conflict(
          `ส่วน “${meta.label}” ต้องมีไลเซนส์ที่ครอบคลุมส่วนนี้ก่อน จึงจะเปิดได้`,
        );
      }
    }

    const stored = await this.db.forSite(siteId, async (tx) => {
      const site = await tx.site.findUnique({ where: { id: siteId }, select: { settings: true } });
      if (!site) throw ApiException.notFound('ไม่พบเว็บนี้');

      const previous = siteFeatureFlagsFromSettings(site.settings);
      const flags: SiteFeatureFlags = { ...previous, ...requested };
      await tx.site.update({
        where: { id: siteId },
        data: {
          settings: { ...asRecord(site.settings), flags } as Prisma.InputJsonValue,
        },
      });
      return flags;
    });

    await this.audit.log({
      siteId,
      userId: actorId,
      action: 'site.features.update',
      target: siteId,
      meta: { flags: requested as Prisma.InputJsonObject },
    });

    return { items: this.views(stored, disabled, this.license.status()) };
  }

  async isEnabled(siteId: string, key: FeatureFlagKey): Promise<boolean> {
    if (!this.unlocked(key, this.license.status())) return false;
    return isFeatureOn(key, { flags: await this.flags(siteId), disabled: this.platformDisabled() });
  }

  /** A paid capability needs a licence that lists it; free ones are always open. */
  private unlocked(key: FeatureFlagKey, status: LicenseStatus): boolean {
    const meta = FEATURE_FLAG_META[key];
    return !meta.requiresLicense || licenseCoversFeature(status, key as LicenseFeature);
  }

  private views(
    flags: SiteFeatureFlags,
    disabled: readonly FeatureFlagKey[],
    status: LicenseStatus,
  ): FeatureFlagView[] {
    return FEATURE_FLAG_KEYS.map((key) => {
      const unlocked = this.unlocked(key, status);
      return {
        key,
        enabled: unlocked && isFeatureOn(key, { flags, disabled }),
        lockedByPlatform: disabled.includes(key),
        lockedByLicense: !unlocked,
      };
    });
  }
}

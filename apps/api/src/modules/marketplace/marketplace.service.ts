import { createPublicKey, verify as verifySignature, type KeyObject } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import {
  comparePackVersions,
  marketplacePackSchema,
  parseMarketplacePackToken,
  type ApiLocale,
  type InstalledPack,
  type MarketplaceInstallInput,
  type MarketplacePack,
  type MarketplacePackReason,
  type MarketplacePackSource,
  type MarketplacePackSummary,
  type MarketplaceSection,
  type MarketplaceView,
} from '@lumio/shared';
import { Prisma, type SiteBlockPack as SiteBlockPackRow } from '@prisma/client';
import { ApiException } from '../../common/api-error';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { marketplaceLumioVersion, marketplacePlatformDisabled } from './marketplace.config';
import { MARKETPLACE_PUBLIC_KEY } from './marketplace.keys';
import { findOfficialPack, OFFICIAL_PACKS } from './official-packs';

const asJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

/** The stored manifest of a row, or null when it no longer matches the schema. */
export const readPackManifest = (value: unknown): MarketplacePack | null => {
  const parsed = marketplacePackSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export type PackVerification =
  { ok: true; pack: MarketplacePack } | { ok: false; reason: MarketplacePackReason };

/**
 * Checks the Ed25519 signature of a vendor pack. Unlike a licence, a pack also
 * carries its own content, so a valid signature is the only thing that separates
 * a curated pack from text someone pasted into the install box.
 */
export const verifyPackSignature = (token: string, publicKey: string): PackVerification => {
  const parsed = parseMarketplacePackToken(token);
  if (!parsed.ok) return parsed;

  const raw = publicKey.trim();
  if (raw.length === 0) return { ok: false, reason: 'no_public_key' };

  let key: KeyObject;
  try {
    key = raw.includes('-----BEGIN')
      ? createPublicKey(raw)
      : createPublicKey({ key: Buffer.from(raw, 'base64'), format: 'der', type: 'spki' });
  } catch {
    return { ok: false, reason: 'no_public_key' };
  }

  try {
    const valid = verifySignature(
      null,
      Buffer.from(parsed.parsed.signingInput, 'utf8'),
      key,
      Buffer.from(parsed.parsed.signature),
    );
    return valid ? { ok: true, pack: parsed.parsed.pack } : { ok: false, reason: 'bad_signature' };
  } catch {
    return { ok: false, reason: 'bad_signature' };
  }
};

/** Plain-language Thai for why a signed pack was refused. */
const packFailureMessage = (reason: MarketplacePackReason): string => {
  switch (reason) {
    case 'bad_signature':
      return 'ลายเซ็นของแพ็กไม่ถูกต้อง จึงยังติดตั้งไม่ได้';
    case 'no_public_key':
      return 'เซิร์ฟเวอร์นี้ยังไม่ได้ตั้งกุญแจสำหรับตรวจลายเซ็นของตลาดบล็อก';
    case 'invalid':
      return 'แพ็กมีรูปแบบไม่ถูกต้อง กรุณาขอไฟล์ใหม่จากผู้พัฒนา';
    default:
      return 'ไฟล์แพ็กเสียหายหรือไม่ใช่ไฟล์ของ Lumio';
  }
};

const toInstalled = (row: SiteBlockPackRow, manifest: MarketplacePack): InstalledPack => ({
  key: row.packKey,
  name: manifest.name,
  version: row.version,
  source: row.source === 'external' ? 'external' : 'official',
  enabled: row.enabled,
  sectionCount: manifest.sections.length,
  signed: row.token !== null,
  installedAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const toSummary = (
  pack: MarketplacePack,
  row: SiteBlockPackRow | undefined,
): MarketplacePackSummary => ({
  key: pack.key,
  name: pack.name,
  nameEn: pack.nameEn ?? null,
  description: pack.description,
  descriptionEn: pack.descriptionEn ?? null,
  version: pack.version,
  author: pack.author,
  homepage: pack.homepage ?? null,
  license: pack.license ?? null,
  source: 'official',
  sectionCount: pack.sections.length,
  installed: Boolean(row),
  installedVersion: row?.version ?? null,
  enabled: row?.enabled ?? false,
  updateAvailable: Boolean(row && comparePackVersions(pack.version, row.version) > 0),
});

interface ResolvedPack {
  pack: MarketplacePack;
  source: MarketplacePackSource;
  token: string | null;
}

/**
 * The block marketplace for one site (docs/PROGRESS.md "ก้อนถัดไป B").
 *
 * Installing a pack is site data, so every query runs inside `forSite` and is
 * isolated by RLS. A pack is only ever stored after its manifest passed
 * `marketplacePackSchema` — official packs are validated when this build loads,
 * vendor packs only after their signature verified. Nothing here executes pack
 * content: sections are data the editor inserts like a saved section.
 */
@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** The catalogue and what this site already installed. */
  async view(siteId: string): Promise<MarketplaceView> {
    const rows = await this.db.forSite(siteId, (tx) =>
      tx.siteBlockPack.findMany({ orderBy: [{ createdAt: 'desc' }] }),
    );
    const byKey = new Map(rows.map((row) => [row.packKey, row]));

    const installed = rows.flatMap((row) => {
      const manifest = readPackManifest(row.manifest);
      return manifest ? [toInstalled(row, manifest)] : [];
    });

    return {
      catalog: OFFICIAL_PACKS.map((pack) => toSummary(pack, byKey.get(pack.key))),
      installed,
    };
  }

  /**
   * Verifies a pasted token without installing it, so the owner can read the
   * pack's name, author and sections before deciding.
   */
  verify(token: string): MarketplacePack {
    this.assertWritable();
    return this.resolveSigned(token).pack;
  }

  /** Installs an official pack by key or a signed vendor pack, upgrading in place. */
  async install(
    siteId: string,
    input: MarketplaceInstallInput,
    actorId: string,
  ): Promise<InstalledPack> {
    this.assertWritable();
    const resolved = await this.resolve(input);

    const row = await this.db.forSite(siteId, async (tx) => {
      const existing = await tx.siteBlockPack.findUnique({
        where: { siteId_packKey: { siteId, packKey: resolved.pack.key } },
      });

      if (existing && comparePackVersions(resolved.pack.version, existing.version) <= 0) {
        throw ApiException.conflict(
          existing.version === resolved.pack.version
            ? 'แพ็กนี้ติดตั้งเวอร์ชันนี้อยู่แล้ว'
            : 'มีแพ็กเวอร์ชันใหม่กว่าติดตั้งอยู่แล้ว',
        );
      }

      const data = {
        version: resolved.pack.version,
        source: resolved.source,
        manifest: asJson(resolved.pack),
        token: resolved.token,
        enabled: existing ? existing.enabled : true,
      };

      const saved = existing
        ? await tx.siteBlockPack.update({
            where: { siteId_packKey: { siteId, packKey: resolved.pack.key } },
            data,
          })
        : await tx.siteBlockPack.create({
            data: { siteId, packKey: resolved.pack.key, ...data },
          });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: existing ? 'marketplace.pack.update' : 'marketplace.pack.install',
          target: resolved.pack.key,
          meta: {
            name: resolved.pack.name,
            version: resolved.pack.version,
            source: resolved.source,
            sections: resolved.pack.sections.length,
          },
        },
      });

      return saved;
    });

    return toInstalled(row, resolved.pack);
  }

  /** Turns an installed pack's sections on or off in the editor. */
  async setEnabled(
    siteId: string,
    packKey: string,
    enabled: boolean,
    actorId: string,
  ): Promise<InstalledPack> {
    this.assertWritable();

    const row = await this.db.forSite(siteId, async (tx) => {
      const existing = await tx.siteBlockPack.findUnique({
        where: { siteId_packKey: { siteId, packKey } },
      });
      if (!existing) throw ApiException.notFound('ไม่พบแพ็กนี้ในเว็บของคุณ');

      const updated = await tx.siteBlockPack.update({
        where: { siteId_packKey: { siteId, packKey } },
        data: { enabled },
      });

      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: enabled ? 'marketplace.pack.enable' : 'marketplace.pack.disable',
          target: packKey,
          meta: { version: updated.version },
        },
      });

      return updated;
    });

    const manifest = readPackManifest(row.manifest);
    if (!manifest) throw ApiException.validation('ข้อมูลแพ็กที่บันทึกไว้เสียหาย');
    return toInstalled(row, manifest);
  }

  /**
   * Removes a pack. Pages that used its sections keep working: every block in a
   * pack is one this build renders, so nothing becomes an unknown block.
   */
  async remove(siteId: string, packKey: string, actorId: string): Promise<void> {
    this.assertWritable();

    await this.db.forSite(siteId, async (tx) => {
      const existing = await tx.siteBlockPack.findUnique({
        where: { siteId_packKey: { siteId, packKey } },
      });
      if (!existing) throw ApiException.notFound('ไม่พบแพ็กนี้ในเว็บของคุณ');

      await tx.siteBlockPack.delete({ where: { siteId_packKey: { siteId, packKey } } });
      await tx.auditLog.create({
        data: {
          siteId,
          userId: actorId,
          action: 'marketplace.pack.remove',
          target: packKey,
          meta: { version: existing.version },
        },
      });
    });
  }

  /** Sections of every enabled pack, as the editor's section library reads them. */
  async sections(siteId: string, locale: ApiLocale = 'th'): Promise<MarketplaceSection[]> {
    const rows = await this.db.forSite(siteId, (tx) =>
      tx.siteBlockPack.findMany({
        where: { enabled: true },
        orderBy: [{ createdAt: 'desc' }],
      }),
    );

    return rows.flatMap((row) => {
      const manifest = readPackManifest(row.manifest);
      if (!manifest) {
        this.logger.warn(`ข้ามแพ็ก ${row.packKey} เพราะข้อมูลที่บันทึกไว้เสียหาย`);
        return [];
      }

      return manifest.sections.map((section, index) => ({
        id: `marketplace:${manifest.key}:${index}`,
        name: locale === 'en' ? (section.nameEn ?? section.name) : section.name,
        nameEn: section.nameEn ?? null,
        packKey: manifest.key,
        packName: locale === 'en' ? (manifest.nameEn ?? manifest.name) : manifest.name,
        packVersion: manifest.version,
        blocks: section.blocks,
      }));
    });
  }

  private assertWritable(): void {
    if (marketplacePlatformDisabled()) {
      throw ApiException.forbidden('ขณะนี้ระบบปิดการติดตั้งแพ็กชั่วคราว กรุณาลองใหม่ภายหลัง');
    }
  }

  private async resolve(input: MarketplaceInstallInput): Promise<ResolvedPack> {
    if (input.key !== undefined) {
      const pack = findOfficialPack(input.key);
      if (!pack) throw ApiException.notFound('ไม่พบแพ็กนี้ในคลัง');
      return { pack, source: 'official', token: null };
    }
    return this.resolveSigned(input.token ?? '');
  }

  private resolveSigned(token: string): ResolvedPack {
    const verification = verifyPackSignature(token.trim(), this.publicKey());
    if (!verification.ok) {
      throw ApiException.validation(packFailureMessage(verification.reason));
    }
    const pack = verification.pack;

    if (findOfficialPack(pack.key)) {
      throw ApiException.conflict('ชื่อ key นี้ใช้กับแพ็กของระบบ กรุณาตั้งชื่อใหม่');
    }

    const lumioVersion = marketplaceLumioVersion();
    if (
      pack.minLumioVersion &&
      lumioVersion &&
      comparePackVersions(lumioVersion, pack.minLumioVersion) < 0
    ) {
      throw ApiException.conflict(
        `แพ็กนี้ต้องใช้ Lumio เวอร์ชัน ${pack.minLumioVersion} ขึ้นไป (เวอร์ชันนี้ ${lumioVersion})`,
      );
    }

    return { pack, source: 'external', token: token.trim() };
  }

  /** Production trusts only the key baked into the build; env is a dev convenience. */
  private publicKey(): string {
    const override =
      process.env.NODE_ENV === 'production' ? '' : (process.env.MARKETPLACE_PUBLIC_KEY ?? '');
    return (override || MARKETPLACE_PUBLIC_KEY).trim();
  }
}

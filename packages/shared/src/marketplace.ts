import { z } from 'zod';
import { blockTreeSchema, type BlockNode, type BlockTree } from './blocks.js';
import { compareVersions } from './version.js';

/**
 * Block marketplace (docs/design/16-apps.md, docs/PROGRESS.md "ก้อนถัดไป B").
 *
 * A pack is data, never code: it ships ready-made sections built from the block
 * types this build already renders. That keeps the marketplace free of a new
 * execution surface (no iframe, no scripts, no database access), and a pack that
 * is uninstalled cannot break a page because every block it used still ships
 * with Lumio.
 *
 * Third-party packs are only accepted when they carry an Ed25519 signature made
 * with the marketplace key, exactly like a licence token (docs/design/24).
 */

/** `lumio_pack_v1.<base64url payload>.<base64url signature>` */
export const MARKETPLACE_PACK_TOKEN_PREFIX = 'lumio_pack_v1.';
export const MARKETPLACE_PACK_TOKEN_PATTERN = /^lumio_pack_v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/** A signed pack is small; anything bigger is either broken or hostile. */
export const MARKETPLACE_PACK_MAX_BYTES = 200 * 1024;
export const MARKETPLACE_PACK_MAX_SECTIONS = 40;
export const MARKETPLACE_PACK_MAX_BLOCKS = 120;

/**
 * Block types a pack may use. Kept in sync with `@lumio/blocks` by a test in
 * that package, so a pack can only ever reference blocks that every Lumio build
 * renders (the fallback when a type really is missing is `UnknownBlock`).
 */
export const BUILTIN_BLOCK_TYPES = [
  'heading',
  'paragraph',
  'image',
  'button',
  'hero',
  'features',
  'products',
  'posts',
  'form',
  'language-switcher',
] as const;
export type BuiltinBlockType = (typeof BUILTIN_BLOCK_TYPES)[number];

export const isBuiltinBlockType = (value: unknown): value is BuiltinBlockType =>
  typeof value === 'string' && (BUILTIN_BLOCK_TYPES as readonly string[]).includes(value);

/** Every block type used by a tree, the type itself plus all of its children. */
export const packBlockTypes = (blocks: readonly BlockNode[]): string[] =>
  blocks.flatMap((block) => [block.type, ...packBlockTypes(block.children)]);

const PACK_KEY_PATTERN = /^[a-z0-9][a-z0-9-]{1,63}$/;
const PACK_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

export const marketplacePackKeySchema = z
  .string()
  .trim()
  .regex(PACK_KEY_PATTERN, 'ชื่อแพ็กใช้ได้เฉพาะ a-z, 0-9 และขีดกลาง');

export const marketplacePackVersionSchema = z
  .string()
  .trim()
  .regex(PACK_VERSION_PATTERN, 'เลขเวอร์ชันต้องอยู่ในรูป 1.2.3');

/** One ready-made section a pack adds to the editor's section library. */
export const marketplacePackSectionSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    nameEn: z.string().trim().min(1).max(80).optional(),
    description: z.string().trim().max(200).optional(),
    descriptionEn: z.string().trim().max(200).optional(),
    blocks: blockTreeSchema,
  })
  .strict()
  .superRefine((section, ctx) => {
    if (section.blocks.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['blocks'],
        message: 'ส่วนต้องมีบล็อกอย่างน้อยหนึ่งบล็อก',
      });
      return;
    }
    const unknown = packBlockTypes(section.blocks).find((type) => !isBuiltinBlockType(type));
    if (unknown) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['blocks'],
        message: `แพ็กอ้างบล็อกที่ระบบไม่มี: ${unknown}`,
      });
    }
  });

export type MarketplacePackSection = z.infer<typeof marketplacePackSectionSchema>;

/**
 * The manifest of one pack. `strict()` on purpose: a pack that declares an
 * entry script, a permission scope or any other unknown field is rejected
 * instead of silently ignored, so a vendor can never think it installed more
 * than it did.
 */
export const marketplacePackSchema = z
  .object({
    v: z.literal(1),
    key: marketplacePackKeySchema,
    name: z.string().trim().min(1).max(120),
    nameEn: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().min(1).max(400),
    descriptionEn: z.string().trim().max(400).optional(),
    version: marketplacePackVersionSchema,
    author: z.string().trim().min(1).max(120),
    /** Where the vendor's page is; shown to the owner before installing. */
    homepage: z.string().trim().url().max(500).optional(),
    /** Licence the pack's content is shared under, e.g. "CC BY 4.0". */
    license: z.string().trim().max(60).optional(),
    /** Oldest Lumio that can render the pack; enforced on install. */
    minLumioVersion: marketplacePackVersionSchema.optional(),
    sections: z.array(marketplacePackSectionSchema).min(1).max(MARKETPLACE_PACK_MAX_SECTIONS),
  })
  .strict()
  .superRefine((pack, ctx) => {
    const blocks = pack.sections.reduce(
      (total, section) => total + packBlockTypes(section.blocks).length,
      0,
    );
    if (blocks > MARKETPLACE_PACK_MAX_BLOCKS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sections'],
        message: `แพ็กมีบล็อกมากเกินไป (สูงสุด ${MARKETPLACE_PACK_MAX_BLOCKS})`,
      });
    }
  });

export type MarketplacePack = z.infer<typeof marketplacePackSchema>;

export const MARKETPLACE_PACK_SOURCES = ['official', 'external'] as const;
export type MarketplacePackSource = (typeof MARKETPLACE_PACK_SOURCES)[number];

export const MARKETPLACE_PACK_REASONS = [
  'ok',
  'malformed',
  'invalid',
  'bad_signature',
  'no_public_key',
  'too_new',
] as const;
export type MarketplacePackReason = (typeof MARKETPLACE_PACK_REASONS)[number];

export interface ParsedMarketplacePackToken {
  /** The exact text the signature covers. */
  signingInput: string;
  /** Raw Ed25519 signature bytes. */
  signature: Uint8Array;
  pack: MarketplacePack;
}

const decodeBase64Url = (value: string): Uint8Array => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const utf8 = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

/**
 * Splits a signed pack and validates the manifest. The signature itself is
 * checked on the server, where the public key lives; this half is safe to reuse
 * in a browser.
 */
export const parseMarketplacePackToken = (
  token: string,
):
  | { ok: true; parsed: ParsedMarketplacePackToken }
  | { ok: false; reason: MarketplacePackReason } => {
  const trimmed = token.trim();
  if (trimmed.length === 0 || trimmed.length > MARKETPLACE_PACK_MAX_BYTES) {
    return { ok: false, reason: 'malformed' };
  }
  if (!MARKETPLACE_PACK_TOKEN_PATTERN.test(trimmed)) return { ok: false, reason: 'malformed' };

  const [prefix, payloadSegment, signatureSegment] = trimmed.split('.');
  if (prefix !== 'lumio_pack_v1' || !payloadSegment || !signatureSegment) {
    return { ok: false, reason: 'malformed' };
  }

  let pack: MarketplacePack;
  try {
    const parsed: unknown = JSON.parse(utf8(decodeBase64Url(payloadSegment)));
    pack = marketplacePackSchema.parse(parsed);
  } catch {
    return { ok: false, reason: 'invalid' };
  }

  let signature: Uint8Array;
  try {
    signature = decodeBase64Url(signatureSegment);
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (signature.length !== 64) return { ok: false, reason: 'malformed' };

  return {
    ok: true,
    parsed: { signingInput: `${prefix}.${payloadSegment}`, signature, pack },
  };
};

/** Numeric comparison of `1.2.3` style versions; a pre-release sorts before its release. */
export const comparePackVersions = compareVersions;

/** A pack in the catalogue, with what this site already has of it. */
export interface MarketplacePackSummary {
  key: string;
  name: string;
  nameEn: string | null;
  description: string;
  descriptionEn: string | null;
  version: string;
  author: string;
  homepage: string | null;
  license: string | null;
  source: MarketplacePackSource;
  sectionCount: number;
  installed: boolean;
  installedVersion: string | null;
  enabled: boolean;
  /** The catalogue carries a newer version than the installed one. */
  updateAvailable: boolean;
}

/** One pack this site installed. */
export interface InstalledPack {
  key: string;
  name: string;
  version: string;
  source: MarketplacePackSource;
  enabled: boolean;
  sectionCount: number;
  /** True when the stored manifest was accepted from a signed token. */
  signed: boolean;
  installedAt: string;
  updatedAt: string;
}

export interface MarketplaceView {
  catalog: MarketplacePackSummary[];
  installed: InstalledPack[];
}

/** A section of an installed pack, as the editor inserts it. */
export interface MarketplaceSection {
  /** Stable id used by the editor picker, e.g. `marketplace:lumio-launch:0`. */
  id: string;
  name: string;
  nameEn: string | null;
  packKey: string;
  packName: string;
  packVersion: string;
  blocks: BlockTree;
}

export const marketplaceTokenInputSchema = z
  .object({
    /** The signed pack token a vendor sent; verified before anything is stored. */
    token: z.string().trim().min(1).max(MARKETPLACE_PACK_MAX_BYTES),
  })
  .strict();
export type MarketplaceTokenInput = z.infer<typeof marketplaceTokenInputSchema>;

/** Installs an official pack by key, or a third-party pack from its token. */
export const marketplaceInstallSchema = z
  .object({
    key: marketplacePackKeySchema.optional(),
    token: z.string().trim().min(1).max(MARKETPLACE_PACK_MAX_BYTES).optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.key === undefined && input.token === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['token'],
        message: 'ต้องระบุแพ็กที่ต้องการติดตั้ง',
      });
    }
    if (input.key !== undefined && input.token !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['token'],
        message: 'เลือกได้อย่างใดอย่างหนึ่ง: แพ็กจากคลัง หรือโทเคนที่ลงลายเซ็น',
      });
    }
  });
export type MarketplaceInstallInput = z.infer<typeof marketplaceInstallSchema>;

export const marketplacePackToggleSchema = z.object({ enabled: z.boolean() }).strict();
export type MarketplacePackToggleInput = z.infer<typeof marketplacePackToggleSchema>;

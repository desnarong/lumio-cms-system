import { z } from 'zod';

/**
 * Feature flags for phase 2–3 capabilities (docs/design/03-scope.md 3.6).
 *
 * Every flag has three layers, evaluated in this order:
 * 1. the platform kill switch (`LUMIO_DISABLED_FEATURES`) — wins over everything,
 * 2. the site's own choice, saved in `sites.settings.flags`,
 * 3. the default (on), so an existing site never loses a screen on deploy.
 */
export const FEATURE_FLAG_KEYS = [
  'ai',
  'analytics',
  'newsletter',
  'apps',
  'commerce',
  'membership',
  'marketplace',
] as const;
export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export const isFeatureFlagKey = (value: unknown): value is FeatureFlagKey =>
  typeof value === 'string' && (FEATURE_FLAG_KEYS as readonly string[]).includes(value);

export interface FeatureFlagMeta {
  key: FeatureFlagKey;
  /** Plain-language Thai label; the UI never shows the key itself. */
  label: string;
  labelEn: string;
  description: string;
  descriptionEn: string;
  phase: 2 | 3;
  /** Paid capability: needs a licence that lists it (docs/design/24). */
  requiresLicense: boolean;
}

export const FEATURE_FLAG_META: Record<FeatureFlagKey, FeatureFlagMeta> = {
  ai: {
    key: 'ai',
    label: 'ผู้ช่วย AI',
    labelEn: 'AI assistant',
    description: 'ช่วยเขียน แปล และแนะนำคำอธิบายรูปด้วย AI',
    descriptionEn: 'Helps write, translate and describe images with AI',
    phase: 2,
    requiresLicense: false,
  },
  analytics: {
    key: 'analytics',
    label: 'สถิติผู้เข้าชม',
    labelEn: 'Visitor analytics',
    description: 'นับผู้เข้าชมและแสดงหน้าที่ถูกเปิดบ่อย',
    descriptionEn: 'Counts visitors and shows the most-viewed pages',
    phase: 2,
    requiresLicense: false,
  },
  newsletter: {
    key: 'newsletter',
    label: 'รายชื่อผู้ติดตามข่าว',
    labelEn: 'Newsletter',
    description: 'เก็บรายชื่อผู้ติดตามและส่งข่าวถึงพวกเขา',
    descriptionEn: 'Collects subscribers and sends them news',
    phase: 2,
    requiresLicense: false,
  },
  apps: {
    key: 'apps',
    label: 'Apps เสริม',
    labelEn: 'Apps',
    description: 'ติดตั้งส่วนเสริมจากคลัง Apps ให้เว็บนี้',
    descriptionEn: 'Installs add-ons from the Apps catalog',
    phase: 2,
    requiresLicense: false,
  },
  commerce: {
    key: 'commerce',
    label: 'ร้านค้า',
    labelEn: 'Shop',
    description: 'สินค้า ตะกร้า คำสั่งซื้อ และการรับเงิน',
    descriptionEn: 'Products, cart, orders and payments',
    phase: 3,
    requiresLicense: false,
  },
  membership: {
    key: 'membership',
    label: 'สมาชิกและเพย์วอลล์',
    labelEn: 'Membership and paywall',
    description: 'ขายสมาชิกเข้าถึงเนื้อหาบางหน้า (ต้องมีไลเซนส์)',
    descriptionEn: 'Sells memberships that unlock gated pages (needs a licence)',
    phase: 3,
    requiresLicense: true,
  },
  marketplace: {
    key: 'marketplace',
    label: 'ตลาดบล็อก',
    labelEn: 'Block marketplace',
    description: 'ติดตั้งชุดบล็อกจากภายนอก (ต้องมีไลเซนส์)',
    descriptionEn: 'Installs third-party block packs (needs a licence)',
    phase: 2,
    requiresLicense: true,
  },
};

/** Only the flags a site actually turned off are stored. */
export type SiteFeatureFlags = Partial<Record<FeatureFlagKey, boolean>>;

export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagKey, boolean> = {
  ai: true,
  analytics: true,
  newsletter: true,
  apps: true,
  commerce: true,
  /** Paid capabilities start off and an unlicensed build ignores the switch. */
  membership: false,
  marketplace: false,
};

/** Drops unknown keys and non-boolean values from a stored settings blob. */
export const normalizeFeatureFlags = (value: unknown): SiteFeatureFlags => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const flags: SiteFeatureFlags = {};
  for (const key of FEATURE_FLAG_KEYS) {
    if (typeof source[key] === 'boolean') flags[key] = source[key];
  }
  return flags;
};

/** Reads the comma-separated platform kill switch, ignoring unknown names. */
export const parseDisabledFeatures = (value: string | null | undefined): FeatureFlagKey[] => {
  if (!value) return [];
  return value
    .split(/[,;\s]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(isFeatureFlagKey);
};

export interface FeatureFlagResolverInput {
  /** The site's stored choose, `sites.settings.flags`. */
  flags?: SiteFeatureFlags;
  /** Flags the platform closed for everyone, from the environment. */
  disabled?: readonly FeatureFlagKey[];
}

/** True when a site may use the feature right now. */
export const isFeatureOn = (
  key: FeatureFlagKey,
  { flags = {}, disabled = [] }: FeatureFlagResolverInput = {},
): boolean => {
  if (disabled.includes(key)) return false;
  return flags[key] ?? DEFAULT_FEATURE_FLAGS[key];
};

export const featureFlagViewSchema = z.object({
  key: z.enum(FEATURE_FLAG_KEYS),
  enabled: z.boolean(),
  /** Closed by the platform, so the site cannot switch it back on. */
  lockedByPlatform: z.boolean(),
  /** Paid capability that this deployment's licence does not include. */
  lockedByLicense: z.boolean(),
});
export type FeatureFlagView = z.infer<typeof featureFlagViewSchema>;

export const featureFlagListSchema = z.object({
  items: z.array(featureFlagViewSchema),
});
export type FeatureFlagList = z.infer<typeof featureFlagListSchema>;

export const updateFeatureFlagsInputSchema = z
  .object({
    flags: z.record(z.string(), z.boolean()),
  })
  .superRefine((input, ctx) => {
    for (const key of Object.keys(input.flags)) {
      if (!isFeatureFlagKey(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['flags', key],
          message: 'ไม่รู้จักส่วนเสริมนี้',
        });
      }
    }
  });
export type UpdateFeatureFlagsInput = z.infer<typeof updateFeatureFlagsInputSchema>;

/** Flags of one site, as the admin and the guards read them. */
export const siteFeatureFlagsFromSettings = (settings: unknown): SiteFeatureFlags => {
  if (settings === null || typeof settings !== 'object' || Array.isArray(settings)) return {};
  return normalizeFeatureFlags((settings as Record<string, unknown>).flags);
};

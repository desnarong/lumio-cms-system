import { z } from 'zod';

/**
 * How a site reaches the outside world (docs/design/03-scope.md "Publish แล้วได้
 * static HTML บน CDN", 10-architecture.md 10.4).
 *
 * Every address here belongs to the site owner and is typed into the admin, so a
 * deployment never needs an operator to edit `.env` before a customer can
 * publish. Secrets (the upload and purge signing keys) are stored encrypted in
 * `sites.settings.publish` and are never returned by the API; the screen only
 * learns whether one exists.
 */

const isWebAddress = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

export const publishAddressSchema = z
  .string()
  .trim()
  .max(500, 'ที่อยู่ยาวเกินไป')
  .refine((value) => value.length === 0 || isWebAddress(value), 'ที่อยู่ต้องขึ้นต้นด้วย https://');

/** A signing key the customer generated in their CDN/host dashboard. */
const publishSecretSchema = z.string().max(300, 'คีย์ยาวเกินไป');

export const publishSettingsInputSchema = z.object({
  /** Base URL of the renderer, used to fetch the HTML that goes to the CDN. */
  rendererUrl: publishAddressSchema.default(''),
  /** Receives `{ host, path, html }` for every published page. Empty = ISR only. */
  staticPublishUrl: publishAddressSchema.default(''),
  /** Omitted on a later save means "keep the stored key". */
  staticPublishSecret: publishSecretSchema.optional(),
  clearStaticPublishSecret: z.boolean().optional(),
  /** Asks the edge cache to drop the pages that were just republished. */
  cdnPurgeUrl: publishAddressSchema.default(''),
  cdnPurgeSecret: publishSecretSchema.optional(),
  clearCdnPurgeSecret: z.boolean().optional(),
  /** Turning this off keeps static publishing but leaves the cache alone. */
  purgeOnPublish: z.boolean().default(true),
});
export type PublishSettingsInput = z.infer<typeof publishSettingsInputSchema>;

/** What the screen receives; secrets are replaced by presence flags. */
export const publishSettingsViewSchema = z.object({
  rendererUrl: z.string(),
  staticPublishUrl: z.string(),
  hasStaticPublishSecret: z.boolean(),
  cdnPurgeUrl: z.string(),
  hasCdnPurgeSecret: z.boolean(),
  purgeOnPublish: z.boolean(),
  /** The renderer and a static host are both addressed, so pages can be written. */
  staticReady: z.boolean(),
  /** A purge address exists and the switch is on. */
  purgeReady: z.boolean(),
  /** Result of the last publish, so the owner can see it stayed under 10 seconds. */
  lastRun: z
    .object({
      at: z.string(),
      durationMs: z.number().int().nonnegative(),
      delivered: z.boolean(),
      failures: z.array(z.string()),
    })
    .nullable(),
  updatedAt: z.string().nullable(),
});
export type PublishSettingsView = z.infer<typeof publishSettingsViewSchema>;

/** The encrypted shape stored in `sites.settings.publish`. */
export const storedPublishSettingsSchema = z.object({
  rendererUrl: z.string(),
  staticPublishUrl: z.string(),
  /** `enc:v1:...`, never a plain key. */
  staticPublishSecret: z.string().optional(),
  cdnPurgeUrl: z.string(),
  cdnPurgeSecret: z.string().optional(),
  purgeOnPublish: z.boolean(),
  lastRun: z
    .object({
      at: z.string(),
      durationMs: z.number().int().nonnegative(),
      delivered: z.boolean(),
      failures: z.array(z.string()),
    })
    .nullable()
    .default(null),
  updatedAt: z.string(),
});
export type StoredPublishSettings = z.infer<typeof storedPublishSettingsSchema>;

/** Reads `sites.settings.publish` defensively; a broken blob means "not set up". */
export const readStoredPublishSettings = (settings: unknown): StoredPublishSettings | null => {
  if (settings === null || typeof settings !== 'object' || Array.isArray(settings)) return null;
  const candidate = (settings as Record<string, unknown>).publish;
  const parsed = storedPublishSettingsSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
};

/** What a site without any publishing setup looks like. */
export const emptyPublishSettings = (): PublishSettingsInput => ({
  rendererUrl: '',
  staticPublishUrl: '',
  cdnPurgeUrl: '',
  purgeOnPublish: true,
});

/** Result of the “ทดสอบการเผยแพร่” button on the publishing screen. */
export const publishTestResultSchema = z.object({
  ok: z.boolean(),
  message: z.string(),
  durationMs: z.number().int().nonnegative(),
});
export type PublishTestResult = z.infer<typeof publishTestResultSchema>;

/** Longest a page write may take before the publish is reported as slow. */
export const PUBLISH_TARGET_MS = 10_000;

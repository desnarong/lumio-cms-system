import { z } from 'zod';

/**
 * Public API keys (docs/design/12-api.md 12.7). A key belongs to one site and
 * carries only the scopes an owner ticked, so an integration can never read
 * another tenant's data. The plaintext key is shown once, at creation; only its
 * SHA-256 hash is stored, which is why a database leak cannot be replayed.
 */

export const API_KEY_SCOPES = ['content:read'] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

/** Human wording for a scope, used by the admin screen. */
export const API_KEY_SCOPE_LABELS: Record<ApiKeyScope, { th: string; en: string }> = {
  'content:read': {
    th: 'อ่านหน้าเว็บและบทความที่เผยแพร่แล้ว',
    en: 'Read published pages and posts',
  },
};

export const isApiKeyScope = (value: unknown): value is ApiKeyScope =>
  typeof value === 'string' && (API_KEY_SCOPES as readonly string[]).includes(value);

/** Every key starts with this, so a leaked string is recognisable in logs. */
export const API_KEY_PREFIX = 'lum_';

const SECRET_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/** A site id without dashes, so a key resolves its tenant before RLS applies. */
export const compactSiteId = (siteId: string): string => siteId.replace(/-/g, '').toLowerCase();

/** `lum_<site>.<random>`: the site part is not secret, it only routes the lookup. */
export const generateApiKeySecret = (siteId: string): string => {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  let body = '';
  for (const byte of bytes) body += SECRET_ALPHABET[byte % SECRET_ALPHABET.length];
  return `${API_KEY_PREFIX}${compactSiteId(siteId)}.${body}`;
};

/**
 * The part shown after creation ("lum_ab12…"), so two keys are distinguishable
 * without revealing either of them.
 */
export const apiKeyHint = (secret: string): string => secret.slice(0, 11);

const SECRET_PATTERN = /^lum_([0-9a-f]{32})\.([A-Za-z0-9]{16,64})$/;

/**
 * Reads the site out of a presented key. Only the format is checked here; the
 * hash comparison happens on the server inside the site scope it names.
 */
export const parseApiKeySecret = (
  value: string,
): { siteId: string; ok: boolean } | null => {
  const match = SECRET_PATTERN.exec(value);
  const compact = match?.[1];
  if (!compact) return null;
  const siteId = `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
  return { siteId, ok: Boolean(match?.[2]) };
};

/** Rejects anything that cannot be one of our keys before hashing it. */
export const isApiKeyFormat = (value: string): boolean => parseApiKeySecret(value) !== null;

export const apiKeyInputSchema = z.object({
  name: z.string().trim().min(1, 'กรุณาตั้งชื่อกุญแจ').max(80),
  scopes: z.array(z.enum(API_KEY_SCOPES)).min(1, 'เลือกอย่างน้อยหนึ่งสิทธิ์').default(['content:read']),
});
export type ApiKeyInput = z.infer<typeof apiKeyInputSchema>;

export const apiKeySchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Short, non-secret prefix such as "lum_ab12…". */
  hint: z.string(),
  scopes: z.array(z.enum(API_KEY_SCOPES)),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
});
export type ApiKey = z.infer<typeof apiKeySchema>;

export const apiKeyListSchema = z.object({ items: z.array(apiKeySchema) });
export type ApiKeyList = z.infer<typeof apiKeyListSchema>;

/** The only response that ever carries the plaintext secret. */
export const apiKeyCreatedSchema = apiKeySchema.extend({ secret: z.string() });
export type ApiKeyCreated = z.infer<typeof apiKeyCreatedSchema>;

/** One published page or post, as an integration reads it. */
export const publicApiDocumentSchema = z.object({
  id: z.string(),
  type: z.enum(['page', 'post']),
  slug: z.string(),
  title: z.string(),
  locale: z.string(),
  /** ISO instant the page was last published, or null while never published. */
  publishedAt: z.string().nullable(),
  updatedAt: z.string(),
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    noindex: z.boolean(),
  }),
  blocks: z.array(z.unknown()),
});
export type PublicApiDocument = z.infer<typeof publicApiDocumentSchema>;

export const publicApiDocumentSummarySchema = publicApiDocumentSchema.pick({
  id: true,
  type: true,
  slug: true,
  title: true,
  locale: true,
  publishedAt: true,
  updatedAt: true,
});
export type PublicApiDocumentSummary = z.infer<typeof publicApiDocumentSummarySchema>;

export const publicApiDocumentListSchema = z.object({
  items: z.array(publicApiDocumentSummarySchema),
  total: z.number().int(),
});
export type PublicApiDocumentList = z.infer<typeof publicApiDocumentListSchema>;

export const publicApiListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  locale: z.string().trim().min(2).max(10).optional(),
});
export type PublicApiListQuery = z.infer<typeof publicApiListQuerySchema>;

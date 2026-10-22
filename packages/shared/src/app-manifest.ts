import { z } from 'zod';
import { APP_CATEGORIES, APP_PERMISSIONS } from './app.js';

/**
 * A manifest an App developer hosts themselves (docs/design/16-apps.md). The
 * store can fetch it from one URL, validate it here, and then install the App
 * with exactly the scopes the manifest declares. Nothing in the manifest can
 * grant more than the owner approves on the install screen.
 *
 * The shape mirrors `appManifestSchema` in `@lumio/sdk`, which developers use at
 * build time; this copy is what the API validates at install time.
 */

export const EXTERNAL_APP_MANIFEST_MAX_BYTES = 256 * 1024;

export const externalAppManifestSchema = z.object({
  key: z.string().regex(/^[a-z0-9-]+$/, 'key ต้องเป็น a-z, 0-9 และขีดกลาง').min(3).max(60),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(300),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'version ต้องเป็น semver'),
  permissions: z.array(z.enum(APP_PERMISSIONS)).max(APP_PERMISSIONS.length).default([]),
  category: z.enum(APP_CATEGORIES).default('content'),
  /** Admin page to load in the sandbox; resolved against the manifest URL. */
  entry: z.string().trim().min(1).max(500),
  iconUrl: z.string().trim().max(500).optional(),
});
export type ExternalAppManifest = z.infer<typeof externalAppManifestSchema>;

/** What the owner pastes into the store: the URL of the manifest. */
export const externalAppInputSchema = z.object({
  url: z.string().trim().url().max(500),
});
export type ExternalAppInput = z.infer<typeof externalAppInputSchema>;

export const externalAppPreviewSchema = z.object({
  /** The URL that was fetched, after redirects. */
  manifestUrl: z.string(),
  /** Absolute URL of the admin page the sandbox will load. */
  entry: z.string(),
  manifest: externalAppManifestSchema,
});
export type ExternalAppPreview = z.infer<typeof externalAppPreviewSchema>;

/**
 * True for hosts that can never be reached on the public internet. The API
 * refuses these before fetching, so a manifest URL cannot be used to probe the
 * internal network (docs/design/15-security.md 15.3).
 */
export const isPrivateHostname = (hostname: string): boolean => {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.home.arpa')) {
    return true;
  }

  if (host.includes(':')) {
    if (host === '::' || host === '::1') return true;
    if (/^f[cd][0-9a-f]{2}:/i.test(host)) return true;
    if (/^fe[89ab][0-9a-f]:/i.test(host)) return true;
    if (host.startsWith('::ffff:')) return isPrivateHostname(host.slice(7));
    return false;
  }

  const parts = host.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return false;
  const octets = parts.map(Number);
  if (octets.some((octet) => octet > 255)) return true;
  const [a = 0, b = 0] = octets;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
};

/** Only https on a public host may be fetched, unless development allows http. */
export const assertFetchableManifestUrl = (
  raw: string,
  options: { allowHttp?: boolean } = {},
): URL => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('ที่อยู่ manifest ไม่ถูกต้อง');
  }

  const allowedProtocol = url.protocol === 'https:' || (options.allowHttp && url.protocol === 'http:');
  if (!allowedProtocol) {
    throw new Error('manifest ต้องโหลดผ่าน https');
  }
  if (isPrivateHostname(url.hostname)) {
    throw new Error('manifest ต้องอยู่บนโฮสต์สาธารณะ');
  }
  if (url.username || url.password) {
    throw new Error('manifest ต้องไม่ฝังชื่อผู้ใช้หรือรหัสผ่าน');
  }
  return url;
};

/**
 * Resolves `entry` (and `iconUrl`) against the manifest URL, keeping every link
 * on a public https origin. Relative paths are normal; `javascript:`/`data:`
 * links are not.
 */
export const resolveExternalAppLinks = (
  manifest: ExternalAppManifest,
  manifestUrl: string,
  options: { allowHttp?: boolean } = {},
): { entry: string; iconUrl: string | null } => {
  const base = assertFetchableManifestUrl(manifestUrl, options);
  const entry = assertFetchableManifestUrl(new URL(manifest.entry, base).toString(), options);
  const iconUrl = manifest.iconUrl
    ? assertFetchableManifestUrl(new URL(manifest.iconUrl, base).toString(), options).toString()
    : null;
  return { entry: entry.toString(), iconUrl };
};

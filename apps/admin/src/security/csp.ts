/**
 * Security headers for the admin bundle (docs/design/15-security.md 15.2).
 *
 * The admin keeps its access token in the browser, so an injected script is the
 * worst thing that can happen to it. The policy only lets the admin run its own
 * bundle (plus the hashed demo-App script the sandbox inherits), talk to its own
 * API, and refuses to be framed. Nginx serves these headers; the snippet is
 * generated at build time because the API origin is baked into the bundle then.
 */

export interface AdminCspOptions {
  /** `VITE_API_URL`; empty in demo mode, where the admin talks to nobody. */
  apiUrl?: string | undefined;
  /** `'sha256-…'` sources for inline scripts the admin ships on purpose. */
  scriptHashes?: readonly string[];
  /** Extra origins for images, media and requests (e.g. a plain-HTTP media host in dev). */
  extraOrigins?: readonly string[];
}

const GOOGLE_FONTS_CSS = 'https://fonts.googleapis.com';
const GOOGLE_FONTS_FILES = 'https://fonts.gstatic.com';

/** The `scheme://host[:port]` of an absolute http(s) URL, or null for anything else. */
export const originOf = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.origin;
  } catch {
    return null;
  }
};

/** Parses a comma/space separated origin list, dropping anything that is not an origin. */
export const parseOriginList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(/[\s,]+/)
    .map((entry) => originOf(entry))
    .filter((origin): origin is string => origin !== null);

const unique = (values: readonly string[]): string[] => [...new Set(values)];

/** `sha256-<base64>` CSP source for an exact inline script body. */
export const scriptHashSource = async (script: string): Promise<string> => {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(script));
  let binary = '';
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return `'sha256-${btoa(binary)}'`;
};

export const buildAdminCsp = ({
  apiUrl,
  scriptHashes = [],
  extraOrigins = [],
}: AdminCspOptions = {}): string => {
  const api = originOf(apiUrl);
  const remotes = unique([...(api ? [api] : []), ...extraOrigins]);

  const directives: [string, string[]][] = [
    ['default-src', ["'self'"]],
    ['script-src', ["'self'", ...scriptHashes]],
    // React writes `style` attributes and the demo App ships a <style> block.
    ['style-src', ["'self'", "'unsafe-inline'", GOOGLE_FONTS_CSS]],
    ['font-src', ["'self'", 'data:', GOOGLE_FONTS_FILES]],
    // Media can live on any CDN the operator configures, so images allow https.
    ['img-src', ["'self'", 'data:', 'blob:', 'https:', ...remotes]],
    ['media-src', ["'self'", 'blob:', 'https:', ...remotes]],
    ['connect-src', ["'self'", ...remotes]],
    // Installed Apps run in a sandboxed iframe from their own https address.
    ['frame-src', ["'self'", 'https:']],
    ['worker-src', ["'self'", 'blob:']],
    ['object-src', ["'none'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
    ['frame-ancestors', ["'none'"]],
  ];

  return directives.map(([name, sources]) => `${name} ${unique(sources).join(' ')}`).join('; ');
};

/** Every header the admin answers with, CSP included. */
export const adminSecurityHeaders = (options: AdminCspOptions = {}): Record<string, string> => ({
  'Content-Security-Policy': buildAdminCsp(options),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
});

/**
 * The same headers as Nginx `add_header` lines. `always` keeps them on error
 * pages too; the file is included in every `location` because a location with
 * its own `add_header` drops the ones inherited from `server`.
 */
export const nginxHeaderSnippet = (headers: Record<string, string>): string =>
  `${Object.entries(headers)
    .map(([name, value]) => `add_header ${name} "${value.replace(/"/g, '\\"')}" always;`)
    .join('\n')}\n`;

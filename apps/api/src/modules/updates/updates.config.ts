import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Settings for the self-update notice (docs/design/18-deployment.md 18.8).
 *
 * The check is read-only: it fetches one small document and compares version
 * numbers. Applying the update stays with `scripts/update.mjs` on the host,
 * because a process cannot safely rebuild the container it is running in.
 */
export const DEFAULT_UPDATE_MANIFEST_URL = 'https://github.com/desnarong/lumio-cms-system/releases';

/**
 * Accepts the releases page a human copies from the browser and turns it into
 * the GitHub API endpoint, so both spellings work:
 * `https://github.com/o/r/releases` → `https://api.github.com/repos/o/r/releases/latest`.
 */
export const normalizeManifestUrl = (raw: string): string => {
  const value = raw.trim();
  const match = /^https?:\/\/github\.com\/([^/]+)\/([^/?#]+)\/releases\/?$/i.exec(value);
  if (!match) return value;
  return `https://api.github.com/repos/${match[1]}/${match[2]}/releases/latest`;
};

const FALLBACK_VERSION = '0.0.0';

/**
 * Version this build runs. `LUMIO_VERSION` wins (set by the release image),
 * otherwise `apps/api/package.json` is read, which is the same number the
 * shared versioning script keeps in every workspace.
 */
export const readInstalledVersion = (env: NodeJS.ProcessEnv = process.env): string => {
  const fromEnv = (env.LUMIO_VERSION ?? '').trim();
  if (fromEnv.length > 0) return fromEnv;

  try {
    // ../../../ is apps/api from both src/modules/updates and dist/modules/updates.
    const manifest = JSON.parse(readFileSync(join(__dirname, '../../../package.json'), 'utf8')) as {
      version?: unknown;
    };
    if (typeof manifest.version === 'string' && manifest.version.trim().length > 0) {
      return manifest.version.trim();
    }
  } catch {
    // A broken or missing manifest must not stop the API from booting.
  }
  return FALLBACK_VERSION;
};

/** Where the newest release is announced; null when checks are switched off. */
export const updateManifestUrl = (env: NodeJS.ProcessEnv = process.env): string | null => {
  if (env.LUMIO_UPDATE_CHECK === 'false') return null;
  const configured = (env.LUMIO_UPDATE_MANIFEST_URL ?? DEFAULT_UPDATE_MANIFEST_URL).trim();
  return configured.length > 0 ? normalizeManifestUrl(configured) : null;
};

/**
 * Token for a private release feed (the project repository is private). It is
 * read server-side only and never returned by the API, so the admin screen can
 * check without exposing the token to a browser.
 */
export const updateManifestToken = (env: NodeJS.ProcessEnv = process.env): string | null => {
  const token = (env.LUMIO_UPDATE_TOKEN ?? env.GITHUB_TOKEN ?? '').trim();
  return token.length > 0 ? token : null;
};

/** True when the operator wants the host timer to apply updates unattended. */
export const autoUpdateEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.LUMIO_AUTO_UPDATE === 'true';

/** How long a successful answer is reused before asking the manifest again. */
export const updateCheckIntervalMs = (env: NodeJS.ProcessEnv = process.env): number => {
  const minutes = Number(env.LUMIO_UPDATE_CHECK_MINUTES ?? 360);
  if (!Number.isFinite(minutes) || minutes <= 0) return 360 * 60_000;
  return Math.min(minutes, 10_080) * 60_000;
};

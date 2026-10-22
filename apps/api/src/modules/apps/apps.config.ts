/**
 * Platform-level switches for Apps (docs/design/16-apps.md 16.6).
 *
 * `APPS_PLATFORM_DISABLED` is the kill switch: the store keeps rendering, but no
 * App can be installed, configured or called through the bridge. It is read on
 * every request on purpose, so an operator can stop a bad App by restarting the
 * API with the flag set instead of shipping code.
 *
 * `APPS_EXTERNAL_ENABLED` (default on) controls manifests hosted by developers.
 * `APPS_ALLOW_HTTP_MANIFEST` exists for local development only; production
 * manifests must be https.
 */

export const appsPlatformDisabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.APPS_PLATFORM_DISABLED === 'true';

export const externalAppsEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.APPS_EXTERNAL_ENABLED !== 'false';

export const appsAllowHttpManifest = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.APPS_ALLOW_HTTP_MANIFEST === 'true';

export const appsManifestTimeoutMs = (env: NodeJS.ProcessEnv = process.env): number => {
  const value = Number(env.APPS_MANIFEST_TIMEOUT_MS ?? '5000');
  return Number.isFinite(value) && value >= 500 ? Math.min(value, 15_000) : 5_000;
};

/** Up to four hops: enough for a normal CDN redirect, small enough to bound work. */
export const APPS_MANIFEST_MAX_REDIRECTS = 3;

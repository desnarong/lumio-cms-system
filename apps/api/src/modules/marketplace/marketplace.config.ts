/**
 * Platform-level switches for the block marketplace (docs/PROGRESS.md batch B).
 *
 * `MARKETPLACE_PLATFORM_DISABLED` is the kill switch: the installed packs keep
 * rendering, but nothing can be installed, toggled or removed. It is read on
 * every request on purpose, so an operator can stop a bad pack by restarting the
 * API with the flag set instead of shipping code.
 */

export const marketplacePlatformDisabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.MARKETPLACE_PLATFORM_DISABLED === 'true';

/**
 * Version this build reports when checking a pack's `minLumioVersion`. Left
 * unset in development, where the check is skipped rather than guessed.
 */
export const marketplaceLumioVersion = (env: NodeJS.ProcessEnv = process.env): string | null => {
  const value = (env.LUMIO_VERSION ?? '').trim();
  return value.length > 0 ? value : null;
};

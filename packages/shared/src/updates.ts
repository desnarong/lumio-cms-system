import { z } from 'zod';
import { isNewerVersion, normalizeVersion } from './version.js';

/**
 * Self-update metadata (docs/design/18-deployment.md 18.8).
 *
 * A release publishes one small JSON document: its version, where the notes
 * live and, optionally, a short summary. The same parser also reads the GitHub
 * releases API shape (`tag_name` / `html_url` / `body`), so pointing
 * `LUMIO_UPDATE_MANIFEST_URL` at either endpoint works.
 */
export const updateManifestSchema = z.object({
  version: z.string().trim().min(1),
  releasedAt: z.string().trim().min(1).nullish(),
  releaseUrl: z.string().trim().url().nullish(),
  notes: z.string().nullish(),
});

export type UpdateManifest = z.infer<typeof updateManifestSchema>;

/** Why the last check could not name a newer version. */
export type UpdateCheckError = 'unconfigured' | 'unreachable' | 'invalid';

export interface UpdateStatus {
  /** Version this installation runs right now, always present. */
  currentVersion: string;
  /** Newest release the update manifest reported; null when the check failed. */
  latestVersion: string | null;
  updateAvailable: boolean;
  /** When the manifest was last read; null before the first successful check. */
  checkedAt: string | null;
  error: UpdateCheckError | null;
  releaseUrl: string | null;
  notes: string | null;
  /** True when the deployment opted into unattended updates. */
  autoUpdate: boolean;
}

const githubReleaseSchema = z.object({
  tag_name: z.string().trim().min(1),
  html_url: z.string().trim().url().nullish(),
  body: z.string().nullish(),
  published_at: z.string().trim().min(1).nullish(),
});

/**
 * Reads either the Lumio update manifest or a GitHub release into one shape.
 * Returns null instead of throwing so a bad remote document only closes the
 * update notice, never the admin screen.
 */
export const parseUpdateManifest = (value: unknown): UpdateManifest | null => {
  const manifest = updateManifestSchema.safeParse(value);
  if (manifest.success) {
    return { ...manifest.data, version: normalizeVersion(manifest.data.version) };
  }

  const release = githubReleaseSchema.safeParse(value);
  if (!release.success) return null;

  return {
    version: normalizeVersion(release.data.tag_name),
    releasedAt: release.data.published_at ?? null,
    releaseUrl: release.data.html_url ?? null,
    notes: release.data.body ?? null,
  };
};

/** One immutable snapshot of the update state the admin screen renders. */
export const buildUpdateStatus = (
  currentVersion: string,
  options: {
    manifest?: UpdateManifest | null;
    checkedAt?: string | null;
    error?: UpdateCheckError | null;
    autoUpdate?: boolean;
  } = {},
): UpdateStatus => {
  const manifest = options.manifest ?? null;
  const current = normalizeVersion(currentVersion);
  return {
    currentVersion: current,
    latestVersion: manifest?.version ?? null,
    updateAvailable: isNewerVersion(manifest?.version ?? null, current),
    checkedAt: options.checkedAt ?? null,
    error: manifest ? null : (options.error ?? null),
    releaseUrl: manifest?.releaseUrl ?? null,
    notes: manifest?.notes ?? null,
    autoUpdate: options.autoUpdate ?? false,
  };
};

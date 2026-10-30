import { Injectable } from '@nestjs/common';
import { buildUpdateStatus, parseUpdateManifest, type UpdateStatus } from '@lumio/shared';
import {
  autoUpdateEnabled,
  readInstalledVersion,
  updateCheckIntervalMs,
  updateManifestUrl,
} from './updates.config';

const DEFAULT_TIMEOUT_MS = 5_000;
/** A failed check is retried sooner than a successful one, but not on every poll. */
const ERROR_CACHE_MS = 10 * 60_000;

export interface FetchUpdateStatusOptions {
  currentVersion: string;
  manifestUrl: string | null;
  autoUpdate: boolean;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  now?: Date;
}

/**
 * Reads one update manifest and turns it into the snapshot the admin screen
 * shows. Every failure is a value, not an exception: an unreachable update
 * server only closes the notice.
 */
export const fetchUpdateStatus = async ({
  currentVersion,
  manifestUrl,
  autoUpdate,
  fetchImpl,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  now = new Date(),
}: FetchUpdateStatusOptions): Promise<UpdateStatus> => {
  const checkedAt = now.toISOString();
  if (!manifestUrl) {
    return buildUpdateStatus(currentVersion, { checkedAt, autoUpdate, error: 'unconfigured' });
  }

  const request = fetchImpl ?? globalThis.fetch;
  let payload: unknown;
  try {
    const response = await request(manifestUrl, {
      headers: {
        accept: 'application/vnd.github+json, application/json',
        'user-agent': 'Lumio-CMS',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      return buildUpdateStatus(currentVersion, { checkedAt, autoUpdate, error: 'unreachable' });
    }
    payload = await response.json();
  } catch {
    return buildUpdateStatus(currentVersion, { checkedAt, autoUpdate, error: 'unreachable' });
  }

  const manifest = parseUpdateManifest(payload);
  if (!manifest) {
    return buildUpdateStatus(currentVersion, { checkedAt, autoUpdate, error: 'invalid' });
  }

  return buildUpdateStatus(currentVersion, { manifest, checkedAt, autoUpdate });
};

/** Caches the check so opening the admin does not hit GitHub on every screen. */
@Injectable()
export class UpdatesService {
  private cache: { status: UpdateStatus; expiresAt: number } | null = null;

  async status(force = false): Promise<UpdateStatus> {
    const now = Date.now();
    if (!force && this.cache && now < this.cache.expiresAt) {
      return this.cache.status;
    }

    const status = await fetchUpdateStatus({
      currentVersion: readInstalledVersion(),
      manifestUrl: updateManifestUrl(),
      autoUpdate: autoUpdateEnabled(),
      now: new Date(now),
    });

    // Retry a failed check sooner instead of holding the failure for the full
    // interval.
    this.cache = {
      status,
      expiresAt: now + (status.error ? ERROR_CACHE_MS : updateCheckIntervalMs()),
    };
    return status;
  }
}

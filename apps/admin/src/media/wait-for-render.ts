import type { MediaItem } from '@lumio/shared';

interface WaitForRenderOptions {
  /** Reads the latest row from the API. */
  get: (id: string) => Promise<MediaItem>;
  /** Receives every row the poller read, so the screen shows the new status. */
  onUpdate: (item: MediaItem) => void;
  attempts?: number;
  intervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const sleepFor = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The worker writes the resized files after an upload or crop, so the row stays
 * `processing` until it is done. Poll it instead of making the user reopen the
 * library to see the new status.
 */
export const waitForRender = async (
  id: string,
  { get, onUpdate, attempts = 40, intervalMs = 1500, sleep = sleepFor }: WaitForRenderOptions,
): Promise<void> => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await sleep(intervalMs);
    try {
      const latest = await get(id);
      onUpdate(latest);
      if (latest.status !== 'processing') return;
    } catch {
      return;
    }
  }
};

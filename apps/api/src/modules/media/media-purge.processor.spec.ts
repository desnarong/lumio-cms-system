import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MediaService } from './media.service';
import {
  MEDIA_PURGE_INTERVAL_MS,
  MediaPurgeProcessor,
  mediaPurgeInlineEnabled,
  mediaPurgeIntervalMs,
} from './media-purge.processor';

const mediaStub = (summary = { sites: 1, purged: 3 }) => ({
  purgeExpiredTrash: vi.fn().mockResolvedValue(summary),
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('MediaPurgeProcessor', () => {
  it('sweeps the media trash once per run and reports the summary', async () => {
    const media = mediaStub();
    const processor = new MediaPurgeProcessor(media as unknown as MediaService);
    const now = new Date('2026-12-01T00:00:00Z');

    const summary = await processor.runOnce(now);

    expect(summary).toEqual({ sites: 1, purged: 3 });
    expect(media.purgeExpiredTrash).toHaveBeenCalledWith(now);
  });

  it('swallows a failure so the loop keeps running', async () => {
    const media = { purgeExpiredTrash: vi.fn().mockRejectedValue(new Error('storage down')) };
    const processor = new MediaPurgeProcessor(media as unknown as MediaService);

    await expect(processor.runOnce()).resolves.toEqual({ sites: 0, purged: 0 });
  });

  it('does not run in the API unless asked to', () => {
    vi.stubEnv('MEDIA_PURGE_INLINE', '');
    expect(mediaPurgeInlineEnabled()).toBe(false);
    vi.stubEnv('MEDIA_PURGE_INLINE', 'true');
    expect(mediaPurgeInlineEnabled()).toBe(true);
  });

  it('defaults to a daily sweep and honours the env override', () => {
    vi.stubEnv('MEDIA_PURGE_INTERVAL_MINUTES', '');
    expect(mediaPurgeIntervalMs()).toBe(MEDIA_PURGE_INTERVAL_MS);
    vi.stubEnv('MEDIA_PURGE_INTERVAL_MINUTES', '60');
    expect(mediaPurgeIntervalMs()).toBe(60 * 60_000);
  });
});

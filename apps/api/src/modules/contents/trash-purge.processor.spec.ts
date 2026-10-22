import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ContentsService } from './contents.service';
import {
  TRASH_PURGE_INTERVAL_MS,
  TrashPurgeProcessor,
  trashPurgeInlineEnabled,
  trashPurgeIntervalMs,
} from './trash-purge.processor';

const contentsStub = (summary = { sites: 1, purged: 2 }) => ({
  purgeExpiredTrash: vi.fn().mockResolvedValue(summary),
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('TrashPurgeProcessor', () => {
  it('sweeps the trash once per run and reports the summary', async () => {
    const contents = contentsStub();
    const processor = new TrashPurgeProcessor(contents as unknown as ContentsService);
    const now = new Date('2026-12-01T00:00:00Z');

    const summary = await processor.runOnce(now);

    expect(summary).toEqual({ sites: 1, purged: 2 });
    expect(contents.purgeExpiredTrash).toHaveBeenCalledWith(now);
  });

  it('swallows a failure so the loop keeps running', async () => {
    const contents = { purgeExpiredTrash: vi.fn().mockRejectedValue(new Error('db down')) };
    const processor = new TrashPurgeProcessor(contents as unknown as ContentsService);

    await expect(processor.runOnce()).resolves.toEqual({ sites: 0, purged: 0 });
  });

  it('does not run in the API unless asked to', () => {
    vi.stubEnv('TRASH_PURGE_INLINE', '');
    expect(trashPurgeInlineEnabled()).toBe(false);
    vi.stubEnv('TRASH_PURGE_INLINE', 'true');
    expect(trashPurgeInlineEnabled()).toBe(true);
  });

  it('defaults to a daily sweep and honours the env override', () => {
    vi.stubEnv('TRASH_PURGE_INTERVAL_MINUTES', '');
    expect(trashPurgeIntervalMs()).toBe(TRASH_PURGE_INTERVAL_MS);
    vi.stubEnv('TRASH_PURGE_INTERVAL_MINUTES', '30');
    expect(trashPurgeIntervalMs()).toBe(30 * 60_000);
  });
});

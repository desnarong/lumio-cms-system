import { describe, expect, it, vi } from 'vitest';
import type { MediaItem } from '@lumio/shared';
import { waitForRender } from './wait-for-render.js';

const item = (status: MediaItem['status']): MediaItem => ({
  id: 'media-1',
  url: '/media/a.webp',
  srcSet: null,
  filename: 'a.webp',
  mime: 'image/webp',
  sizeBytes: 1024,
  width: 100,
  height: 100,
  alt: null,
  folder: null,
  focalPoint: null,
  variants: [],
  status,
  createdAt: '2026-10-20T00:00:00.000Z',
  updatedAt: '2026-10-20T00:00:00.000Z',
});

const noSleep = async (): Promise<void> => undefined;

describe('waitForRender', () => {
  it('keeps polling until the worker marks the row ready', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce(item('processing'))
      .mockResolvedValueOnce(item('processing'))
      .mockResolvedValueOnce(item('ready'));
    const seen: string[] = [];

    await waitForRender('media-1', {
      get,
      onUpdate: (latest) => seen.push(latest.status),
      sleep: noSleep,
    });

    expect(seen).toEqual(['processing', 'processing', 'ready']);
    expect(get).toHaveBeenCalledTimes(3);
  });

  it('stops after the last attempt when the row never leaves processing', async () => {
    const get = vi.fn().mockResolvedValue(item('processing'));

    await waitForRender('media-1', {
      get,
      onUpdate: () => undefined,
      attempts: 2,
      sleep: noSleep,
    });

    expect(get).toHaveBeenCalledTimes(2);
  });

  it('gives up when the API can no longer read the row', async () => {
    const get = vi.fn().mockRejectedValue(new Error('gone'));

    await waitForRender('media-1', { get, onUpdate: () => undefined, sleep: noSleep });

    expect(get).toHaveBeenCalledTimes(1);
  });
});

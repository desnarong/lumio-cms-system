import { describe, expect, it, vi } from 'vitest';
import type { CdnPurgeNotifier } from './cdn-purge.notifier';
import type { PublishSettingsService } from './publish-settings.service';
import { InMemoryPublishQueue } from './publish.queue';
import { PublishProcessor } from './publish.processor';
import type { RendererNotifier } from './renderer-notifier';
import type { StaticPublisher } from './static-publisher';

const notifierStub = (delivered = true): RendererNotifier =>
  ({
    revalidate: vi
      .fn()
      .mockResolvedValue({ delivered, skipped: false, status: delivered ? 200 : 500 }),
  }) as unknown as RendererNotifier;

const cdnStub = (purged = true): CdnPurgeNotifier =>
  ({
    purge: vi.fn().mockResolvedValue({
      delivered: purged,
      skipped: false,
      status: purged ? 200 : 500,
    }),
  }) as unknown as CdnPurgeNotifier;

const staticStub = (durationMs = 1_200) =>
  ({
    publish: vi.fn().mockResolvedValue({
      delivered: true,
      skipped: false,
      failures: [],
      durationMs,
    }),
  }) as unknown as StaticPublisher;

const settingsStub = (overrides: Record<string, unknown> = {}) => {
  const recordRun = vi.fn().mockResolvedValue(undefined);
  const service = {
    config: vi.fn().mockResolvedValue({
      rendererUrl: 'http://renderer.test',
      staticPublishUrl: 'https://cdn.test/upload',
      staticPublishSecret: 'upload-key',
      cdnPurgeUrl: 'https://purge.test/api',
      cdnPurgeSecret: 'purge-key',
      purgeOnPublish: true,
      ...overrides,
    }),
    recordRun,
  } as unknown as PublishSettingsService;
  return { service, recordRun };
};

describe('PublishProcessor', () => {
  it('purges the edge cache after the renderer accepts the rebuild', async () => {
    const queue = new InMemoryPublishQueue();
    const cdn = cdnStub();
    const settings = settingsStub();
    const processor = new PublishProcessor(
      queue,
      notifierStub(),
      cdn,
      staticStub(),
      settings.service,
    );
    await queue.add({
      siteId: 'site-1',
      kind: 'page',
      host: 'baandoi.example.com',
      paths: ['/', '/menu'],
    });

    const summary = await processor.drain();

    expect(summary).toEqual({ processed: 1, failed: 0, skipped: 0 });
    expect(cdn.purge).toHaveBeenCalledWith(
      { cdnPurgeUrl: 'https://purge.test/api', cdnPurgeSecret: 'purge-key' },
      'baandoi.example.com',
      ['/', '/menu'],
    );
  });

  it('does not purge when the renderer refused the rebuild', async () => {
    const queue = new InMemoryPublishQueue();
    const cdn = cdnStub();
    const settings = settingsStub();
    const processor = new PublishProcessor(
      queue,
      notifierStub(false),
      cdn,
      staticStub(),
      settings.service,
    );
    await queue.add({ siteId: 'site-1', kind: 'page', host: 'baandoi.example.com', paths: ['/'] });

    const summary = await processor.drain();

    expect(summary.failed).toBe(1);
    expect(cdn.purge).not.toHaveBeenCalled();
  });

  it('keeps the publish when the purge fails', async () => {
    const queue = new InMemoryPublishQueue();
    const settings = settingsStub();
    const processor = new PublishProcessor(
      queue,
      notifierStub(),
      cdnStub(false),
      staticStub(),
      settings.service,
    );
    await queue.add({ siteId: 'site-1', kind: 'page', host: 'baandoi.example.com', paths: ['/'] });

    const summary = await processor.drain();

    expect(summary).toEqual({ processed: 1, failed: 0, skipped: 0 });
    expect(queue.failures).toHaveLength(0);
  });

  it('writes static pages with the site configuration and records the duration', async () => {
    const queue = new InMemoryPublishQueue();
    const staticPages = staticStub(2_400);
    const settings = settingsStub();
    const processor = new PublishProcessor(
      queue,
      notifierStub(),
      cdnStub(),
      staticPages,
      settings.service,
    );
    await queue.add({ siteId: 'site-1', kind: 'page', host: 'baandoi.example.com', paths: ['/'] });

    await processor.drain();

    expect(staticPages.publish).toHaveBeenCalledWith(
      {
        rendererUrl: 'http://renderer.test',
        staticPublishUrl: 'https://cdn.test/upload',
        staticPublishSecret: 'upload-key',
      },
      'baandoi.example.com',
      ['/'],
    );
    expect(settings.recordRun).toHaveBeenCalledWith('site-1', {
      durationMs: 2_400,
      delivered: true,
      failures: [],
    });
  });

  it('leaves the cache alone when the owner turned purging off', async () => {
    const queue = new InMemoryPublishQueue();
    const cdn = cdnStub();
    const settings = settingsStub({ purgeOnPublish: false });
    const processor = new PublishProcessor(
      queue,
      notifierStub(),
      cdn,
      staticStub(),
      settings.service,
    );
    await queue.add({ siteId: 'site-1', kind: 'page', host: 'baandoi.example.com', paths: ['/'] });

    await processor.drain();

    expect(cdn.purge).not.toHaveBeenCalled();
  });
});

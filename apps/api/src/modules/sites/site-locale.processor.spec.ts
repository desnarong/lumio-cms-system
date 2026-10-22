import { describe, expect, it, vi } from 'vitest';
import type { SiteLocaleService } from './site-locale.service';
import { InMemorySiteLocaleQueue } from './site-locale.queue';
import { SiteLocaleProcessor } from './site-locale.processor';

const localesStub = (impl: () => Promise<unknown> = async () => ({ locales: 1, pages: 4, copied: 0 })) =>
  ({ run: vi.fn().mockImplementation(impl) }) as unknown as SiteLocaleService;

describe('SiteLocaleProcessor', () => {
  it('drains the queue and marks the job complete', async () => {
    const queue = new InMemorySiteLocaleQueue();
    const locales = localesStub();
    const processor = new SiteLocaleProcessor(queue, locales);
    await queue.add({ siteId: 's1', locales: ['en'], userId: 'u1', publishNow: true });

    const report = await processor.drain();

    expect(report).toEqual({ processed: 1, failed: 0 });
    expect(locales.run).toHaveBeenCalledTimes(1);
    expect(queue.failures).toHaveLength(0);
  });

  it('records a failure and keeps draining', async () => {
    const queue = new InMemorySiteLocaleQueue();
    const locales = localesStub(async () => {
      throw new Error('db down');
    });
    const processor = new SiteLocaleProcessor(queue, locales);
    await queue.add({ siteId: 's1', locales: ['en'], userId: 'u1', publishNow: false });

    const report = await processor.drain();

    expect(report).toEqual({ processed: 0, failed: 1 });
    expect(queue.failures).toHaveLength(1);
  });
});

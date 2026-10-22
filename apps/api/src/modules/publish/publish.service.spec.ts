import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service';
import { InMemoryPublishQueue } from './publish.queue';
import { PublishService } from './publish.service';

const SITE_ID = '00000000-0000-4000-8000-0000000000a1';

const dbWith = (options: { domain?: unknown; site?: unknown } = {}): PrismaService =>
  ({
    forSite: vi.fn(async (_siteId: string, fn: (tx: unknown) => unknown) =>
      fn({ domain: { findFirst: vi.fn().mockResolvedValue(options.domain ?? null) } }),
    ),
    site: { findUnique: vi.fn().mockResolvedValue(options.site ?? null) },
  }) as unknown as PrismaService;

describe('PublishService.primaryHost', () => {
  it('prefers the primary custom domain', async () => {
    const service = new PublishService(
      new InMemoryPublishQueue(),
      dbWith({ domain: { hostname: 'baandoicoffee.com' } }),
    );

    expect(await service.primaryHost(SITE_ID)).toBe('baandoicoffee.com');
  });

  it('falls back to the free subdomain', async () => {
    const service = new PublishService(
      new InMemoryPublishQueue(),
      dbWith({ site: { subdomain: 'baandoi' } }),
    );

    expect(await service.primaryHost(SITE_ID)).toBe('baandoi.lumio.app');
  });

  it('returns null when the site is gone', async () => {
    const service = new PublishService(new InMemoryPublishQueue(), dbWith());
    expect(await service.primaryHost(SITE_ID)).toBeNull();
  });
});

describe('PublishService.enqueuePage', () => {
  it('queues the page path plus the sitemap', async () => {
    const queue = new InMemoryPublishQueue();
    const service = new PublishService(queue, dbWith({ domain: { hostname: 'baandoi.lumio.app' } }));

    const job = await service.enqueuePage({ siteId: SITE_ID, type: 'page', slug: 'about' });

    expect(job).toMatchObject({
      siteId: SITE_ID,
      kind: 'page',
      host: 'baandoi.lumio.app',
      paths: ['/about', '/sitemap.xml'],
    });
    expect(queue.size).toBe(1);
  });

  it('maps a post to its /posts path and home to /', async () => {
    const queue = new InMemoryPublishQueue();
    const service = new PublishService(queue, dbWith());

    const post = await service.enqueuePage({ siteId: SITE_ID, type: 'post', slug: 'beans' });
    const home = await service.enqueuePage({ siteId: SITE_ID, type: 'page', slug: 'home' });

    expect(post.paths[0]).toBe('/posts/beans');
    expect(home.paths[0]).toBe('/');
  });

  it('clears both the default and the language-specific URL for a translated page', async () => {
    const queue = new InMemoryPublishQueue();
    const service = new PublishService(
      queue,
      dbWith({ site: { subdomain: 'baandoi', localeDefault: 'th' } }),
    );

    const job = await service.enqueuePage({
      siteId: SITE_ID,
      type: 'page',
      slug: 'about',
      locale: 'en',
    });

    expect(job.paths).toEqual(['/about', '/sitemap.xml', '/en/about']);
  });

  it('adds no prefix when the page is in the default language', async () => {
    const queue = new InMemoryPublishQueue();
    const service = new PublishService(queue, dbWith({ site: { subdomain: 'baandoi' } }));

    const job = await service.enqueuePage({
      siteId: SITE_ID,
      type: 'page',
      slug: 'about',
      locale: 'th',
    });

    expect(job.paths).toEqual(['/about', '/sitemap.xml']);
  });
});

describe('PublishService.enqueueSite', () => {
  it('queues a whole-site rebuild by default', async () => {
    const queue = new InMemoryPublishQueue();
    const service = new PublishService(queue, dbWith());

    const job = await service.enqueueSite(SITE_ID);

    expect(job.kind).toBe('site');
    expect(job.paths).toEqual(['/', '/sitemap.xml']);
  });
});

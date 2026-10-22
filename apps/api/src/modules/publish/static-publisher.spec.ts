import { afterEach, describe, expect, it, vi } from 'vitest';
import { StaticPublisher, type StaticFetchLike } from './static-publisher';

const site = 'baandoi.example.com';
const config = {
  rendererUrl: 'http://renderer.test',
  staticPublishUrl: 'https://cdn.test/upload',
  staticPublishSecret: 'secret',
};

const response = (body: string, ok = true, status = 200) => ({
  ok,
  status,
  text: async () => body,
  headers: { get: () => 'text/html' },
});

const publisher = (fetchImpl: ReturnType<typeof vi.fn>): StaticPublisher =>
  new StaticPublisher(fetchImpl as unknown as StaticFetchLike);

const uploads = (fetchImpl: ReturnType<typeof vi.fn>) =>
  fetchImpl.mock.calls.filter((call) => (call[1] as { method?: string } | undefined)?.method === 'POST');

describe('StaticPublisher', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('skips when the site has no static host', async () => {
    const fetchImpl = vi.fn();

    const result = await publisher(fetchImpl).publish(
      { ...config, staticPublishUrl: '' },
      site,
      ['/'],
    );

    expect(result.skipped).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('skips when the renderer address is missing', async () => {
    const fetchImpl = vi.fn();

    const result = await publisher(fetchImpl).publish({ ...config, rendererUrl: '' }, site, ['/']);

    expect(result.skipped).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('fetches the rendered HTML and uploads it with a signature', async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: { method?: string }) =>
      init?.method === 'POST' ? response('ok') : response('<html>hello</html>'),
    );

    const result = await publisher(fetchImpl).publish(config, site, ['/', '/about', '/']);

    expect(result.delivered).toBe(true);
    expect(result.skipped).toBe(false);
    expect(result.failures).toEqual([]);
    expect(typeof result.durationMs).toBe('number');
    // Duplicate paths collapse, so two pages × (fetch + upload).
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    const rendererCall = fetchImpl.mock.calls.find((call) =>
      String(call[0]).startsWith('http://renderer.test/'),
    );
    expect(rendererCall?.[1]).toEqual(
      expect.objectContaining({ headers: expect.objectContaining({ 'x-forwarded-host': site }) }),
    );

    const [url, upload] = uploads(fetchImpl)[0] as [
      string,
      { headers: Record<string, string>; body: string },
    ];
    expect(url).toBe('https://cdn.test/upload');
    expect(upload.headers['x-lumio-signature']).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(JSON.parse(upload.body)).toMatchObject({ host: site });
  });

  it('starts every page before the first one finishes', async () => {
    const started = new Set<string>();
    const fetchImpl = vi.fn(async (url: string, init?: { method?: string }) => {
      if (init?.method === 'POST') return response('ok');
      started.add(url);
      await new Promise((resolve) => setTimeout(resolve, 5));
      return response('<html/>');
    });

    const result = await publisher(fetchImpl).publish(config, site, ['/a', '/b', '/c', '/d']);

    expect(result.delivered).toBe(true);
    expect(started.size).toBe(4);
  });

  it('reports pages the renderer or the CDN refused', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response('', true, 500))
      .mockResolvedValueOnce(response('<html/>'))
      .mockResolvedValueOnce(response('no', false, 500));

    const result = await publisher(fetchImpl).publish(config, site, ['/missing', '/about']);

    expect(result.delivered).toBe(false);
    expect(result.failures.sort()).toEqual(['/about', '/missing']);
  });
});

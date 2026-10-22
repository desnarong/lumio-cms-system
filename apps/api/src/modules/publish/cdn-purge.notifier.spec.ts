import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CdnPurgeNotifier } from './cdn-purge.notifier';

const notifier = (fetchImpl: ReturnType<typeof vi.fn>): CdnPurgeNotifier =>
  new CdnPurgeNotifier(fetchImpl as unknown as ConstructorParameters<typeof CdnPurgeNotifier>[0]);

const config = { cdnPurgeUrl: 'https://purge.example/api', cdnPurgeSecret: 'purge-secret' };

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('CdnPurgeNotifier', () => {
  it('does nothing when the site has no CDN', async () => {
    const fetchImpl = vi.fn();

    const result = await notifier(fetchImpl).purge(
      { cdnPurgeUrl: '', cdnPurgeSecret: '' },
      'baandoi.example.com',
      ['/'],
    );

    expect(result).toEqual({ delivered: false, skipped: true, status: null });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('does nothing without a host or paths', async () => {
    const fetchImpl = vi.fn();

    await notifier(fetchImpl).purge(config, null, ['/']);
    await notifier(fetchImpl).purge(config, 'baandoi.example.com', []);

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('posts the host, the paths and signs the body with the site key', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    const result = await notifier(fetchImpl).purge(config, 'baandoi.example.com', ['/', '/menu']);

    expect(result).toEqual({ delivered: true, skipped: false, status: 200 });
    const [url, init] = fetchImpl.mock.calls[0] as [string, { headers: Record<string, string>; body: string }];
    expect(url).toBe('https://purge.example/api');
    expect(init.headers['x-lumio-purge-signature']).toBe(
      createHmac('sha256', 'purge-secret').update(init.body).digest('hex'),
    );
    expect(JSON.parse(init.body)).toEqual({ host: 'baandoi.example.com', paths: ['/', '/menu'] });
  });

  it('reports a refusal without throwing', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503 });

    const result = await notifier(fetchImpl).purge(config, 'baandoi.example.com', ['/']);

    expect(result).toEqual({ delivered: false, skipped: false, status: 503 });
  });

  it('swallows a network error so the publish still succeeds', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(notifier(fetchImpl).purge(config, 'baandoi.example.com', ['/'])).resolves.toEqual({
      delivered: false,
      skipped: false,
      status: null,
    });
  });
});

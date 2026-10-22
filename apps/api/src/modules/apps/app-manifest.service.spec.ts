import { describe, expect, it, vi } from 'vitest';
import { fetchExternalManifest, type ManifestLookup } from './app-manifest.service';

const publicLookup: ManifestLookup = async () => [{ address: '93.184.216.34', family: 4 }];

const response = (body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) => {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    ok: (init.status ?? 200) >= 200 && (init.status ?? 200) < 300,
    status: init.status ?? 200,
    headers: new Headers(init.headers ?? {}),
    text: async () => text,
  } as unknown as Response;
};

const manifest = (overrides: Record<string, unknown> = {}) => ({
  key: 'booking-widget',
  name: 'Booking widget',
  description: 'Takes bookings on the site',
  version: '1.0.0',
  permissions: ['contents:read'],
  category: 'content',
  entry: 'index.html',
  ...overrides,
});

const deps = (impl: typeof fetch, lookupImpl: ManifestLookup = publicLookup) => ({
  fetchImpl: impl,
  lookupImpl,
  allowHttp: false,
  timeoutMs: 1000,
});

describe('fetchExternalManifest', () => {
  it('downloads, validates and resolves the manifest links', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(response(manifest())) as unknown as typeof fetch;

    const preview = await fetchExternalManifest(
      'https://apps.example.com/lumio/manifest.json',
      deps(fetchImpl),
    );

    expect(preview.manifest.key).toBe('booking-widget');
    expect(preview.entry).toBe('https://apps.example.com/lumio/index.html');
  });

  it('refuses a hostname that resolves to a private address', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const lookup = (async () => [{ address: '10.0.0.7', family: 4 }]) as ManifestLookup;

    await expect(
      fetchExternalManifest('https://rebind.example.com/manifest.json', deps(fetchImpl, lookup)),
    ).rejects.toThrow(/โฮสต์สาธารณะ/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('re-checks every redirect before following it', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        response(null, { status: 302, headers: { location: 'http://127.0.0.1/manifest.json' } }),
      ) as unknown as typeof fetch;

    await expect(
      fetchExternalManifest('https://apps.example.com/manifest.json', deps(fetchImpl)),
    ).rejects.toThrow();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('rejects an oversized manifest', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        response(manifest(), { headers: { 'content-length': String(400 * 1024) } }),
      ) as unknown as typeof fetch;

    await expect(
      fetchExternalManifest('https://apps.example.com/manifest.json', deps(fetchImpl)),
    ).rejects.toThrow(/ใหญ่เกินไป/);
  });

  it('rejects invalid JSON and unknown permissions', async () => {
    const badJson = vi.fn().mockResolvedValue(response('not json')) as unknown as typeof fetch;
    await expect(
      fetchExternalManifest('https://apps.example.com/manifest.json', deps(badJson)),
    ).rejects.toThrow(/JSON/);

    const badScope = vi
      .fn()
      .mockResolvedValue(
        response(manifest({ permissions: ['database:write'] })),
      ) as unknown as typeof fetch;
    await expect(
      fetchExternalManifest('https://apps.example.com/manifest.json', deps(badScope)),
    ).rejects.toThrow(/manifest ไม่ถูกต้อง/);
  });
});

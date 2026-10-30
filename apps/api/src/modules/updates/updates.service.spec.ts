import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  autoUpdateEnabled,
  normalizeManifestUrl,
  readInstalledVersion,
  updateCheckIntervalMs,
  updateManifestUrl,
} from './updates.config';
import { fetchUpdateStatus, UpdatesService } from './updates.service';

const jsonResponse = (body: unknown, status = 200): Response =>
  ({ ok: status < 400, status, json: async () => body }) as unknown as Response;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('update settings', () => {
  it('reads the version from the environment before the package manifest', () => {
    expect(readInstalledVersion({ LUMIO_VERSION: ' 0.24.0 ' })).toBe('0.24.0');
    expect(readInstalledVersion({})).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('can switch the check off and defaults to the public release feed', () => {
    expect(updateManifestUrl({})).toBe(
      'https://api.github.com/repos/desnarong/lumio-cms-system/releases/latest',
    );
    expect(updateManifestUrl({ LUMIO_UPDATE_CHECK: 'false' })).toBeNull();
    expect(autoUpdateEnabled({ LUMIO_AUTO_UPDATE: 'true' })).toBe(true);
    expect(autoUpdateEnabled({})).toBe(false);
  });

  it('accepts the releases page a human copies from the browser', () => {
    expect(normalizeManifestUrl('https://github.com/desnarong/lumio-cms-system/releases')).toBe(
      'https://api.github.com/repos/desnarong/lumio-cms-system/releases/latest',
    );
    expect(normalizeManifestUrl('https://example.com/latest.json')).toBe(
      'https://example.com/latest.json',
    );
  });

  it('falls back to six hours for a bad interval', () => {
    expect(updateCheckIntervalMs({})).toBe(360 * 60_000);
    expect(updateCheckIntervalMs({ LUMIO_UPDATE_CHECK_MINUTES: '30' })).toBe(30 * 60_000);
    expect(updateCheckIntervalMs({ LUMIO_UPDATE_CHECK_MINUTES: 'nope' })).toBe(360 * 60_000);
  });
});

describe('fetchUpdateStatus', () => {
  const base = { currentVersion: '0.23.1', autoUpdate: false };

  it('names the newest release and whether it is an update', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        tag_name: 'v0.24.0',
        html_url: 'https://github.com/desnarong/lumio-cms-system/releases/tag/v0.24.0',
        body: 'เพิ่มระบบอัปเดต',
        published_at: '2026-10-30T00:00:00Z',
      }),
    );

    const status = await fetchUpdateStatus({
      ...base,
      manifestUrl: 'https://updates.test/latest.json',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: new Date('2026-10-30T10:00:00Z'),
    });

    expect(status).toMatchObject({
      currentVersion: '0.23.1',
      latestVersion: '0.24.0',
      updateAvailable: true,
      checkedAt: '2026-10-30T10:00:00.000Z',
      notes: 'เพิ่มระบบอัปเดต',
    });
  });

  it('keeps the installed version when checks are switched off', async () => {
    const status = await fetchUpdateStatus({ ...base, manifestUrl: null });
    expect(status).toMatchObject({
      currentVersion: '0.23.1',
      latestVersion: null,
      updateAvailable: false,
      error: 'unconfigured',
    });
  });

  it('turns an unreachable or unreadable manifest into a status, not an error', async () => {
    const down = await fetchUpdateStatus({
      ...base,
      manifestUrl: 'https://updates.test/latest.json',
      fetchImpl: vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch,
    });
    expect(down.error).toBe('unreachable');

    const notFound = await fetchUpdateStatus({
      ...base,
      manifestUrl: 'https://updates.test/latest.json',
      fetchImpl: vi.fn().mockResolvedValue(jsonResponse({}, 404)) as unknown as typeof fetch,
    });
    expect(notFound.error).toBe('unreachable');

    const garbage = await fetchUpdateStatus({
      ...base,
      manifestUrl: 'https://updates.test/latest.json',
      fetchImpl: vi.fn().mockResolvedValue(jsonResponse({ oops: true })) as unknown as typeof fetch,
    });
    expect(garbage.error).toBe('invalid');
  });
});

describe('UpdatesService', () => {
  it('reuses a fresh answer and only refetches when forced', async () => {
    vi.stubEnv('LUMIO_VERSION', '0.23.1');
    vi.stubEnv('LUMIO_UPDATE_MANIFEST_URL', 'https://updates.test/latest.json');
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ version: '0.24.0' }));
    vi.stubGlobal('fetch', fetchImpl);

    const service = new UpdatesService();
    const first = await service.status();
    const second = await service.status();
    const forced = await service.status(true);

    expect(first.updateAvailable).toBe(true);
    expect(second).toBe(first);
    expect(forced.updateAvailable).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});

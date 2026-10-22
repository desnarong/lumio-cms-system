import { describe, expect, it } from 'vitest';
import {
  assertFetchableManifestUrl,
  externalAppManifestSchema,
  isPrivateHostname,
  resolveExternalAppLinks,
} from './app-manifest.js';

const manifest = (overrides: Record<string, unknown> = {}) =>
  externalAppManifestSchema.parse({
    key: 'booking-widget',
    name: 'Booking widget',
    description: 'Takes bookings on the site',
    version: '1.2.0',
    permissions: ['contents:read'],
    category: 'content',
    entry: 'admin/index.html',
    ...overrides,
  });

describe('external App manifest', () => {
  it('accepts the manifest a developer hosts', () => {
    expect(manifest()).toMatchObject({ key: 'booking-widget', version: '1.2.0' });
  });

  it('rejects unknown scopes and malformed versions', () => {
    expect(() => manifest({ permissions: ['database:write'] })).toThrow();
    expect(() => manifest({ version: '1.2' })).toThrow();
  });

  it('blocks loopback, private and local hosts', () => {
    for (const host of [
      'localhost',
      '127.0.0.1',
      '10.0.0.5',
      '172.20.1.1',
      '192.168.1.10',
      '169.254.169.254',
      'api.internal',
      'printer.local',
      '::1',
      'fd00::1',
    ]) {
      expect(isPrivateHostname(host)).toBe(true);
    }
    expect(isPrivateHostname('apps.example.com')).toBe(false);
    expect(isPrivateHostname('8.8.8.8')).toBe(false);
  });

  it('only fetches https on public hosts', () => {
    expect(() => assertFetchableManifestUrl('http://apps.example.com/manifest.json')).toThrow();
    expect(() => assertFetchableManifestUrl('https://127.0.0.1/manifest.json')).toThrow();
    expect(() => assertFetchableManifestUrl('file:///etc/passwd')).toThrow();
    expect(
      assertFetchableManifestUrl('https://apps.example.com/manifest.json').toString(),
    ).toBe('https://apps.example.com/manifest.json');
  });

  it('resolves relative entry and icon links against the manifest URL', () => {
    const links = resolveExternalAppLinks(
      manifest({ iconUrl: 'icon.png' }),
      'https://apps.example.com/lumio/manifest.json',
    );
    expect(links).toEqual({
      entry: 'https://apps.example.com/lumio/admin/index.html',
      iconUrl: 'https://apps.example.com/lumio/icon.png',
    });
  });

  it('refuses an entry that would not run over https', () => {
    expect(() =>
      resolveExternalAppLinks(
        manifest({ entry: 'javascript:alert(1)' }),
        'https://apps.example.com/manifest.json',
      ),
    ).toThrow();
    expect(() =>
      resolveExternalAppLinks(
        manifest({ entry: 'http://internal.local/admin' }),
        'https://apps.example.com/manifest.json',
      ),
    ).toThrow();
  });
});

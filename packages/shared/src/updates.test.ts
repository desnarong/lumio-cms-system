import { describe, expect, it } from 'vitest';
import { compareVersions, isNewerVersion, normalizeVersion } from './version.js';
import { buildUpdateStatus, parseUpdateManifest, updateManifestSchema } from './updates.js';

describe('compareVersions', () => {
  it('orders dotted releases numerically and ignores a leading v', () => {
    expect(normalizeVersion(' v1.2.3 ')).toBe('1.2.3');
    expect(compareVersions('v0.24.0', '0.23.9')).toBe(1);
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
    expect(compareVersions('1.10.0', '1.9.9')).toBe(1);
  });

  it('treats a pre-release as older than its release', () => {
    expect(compareVersions('1.0.0-beta.1', '1.0.0')).toBe(-1);
    expect(compareVersions('1.0.0', '1.0.0-beta.1')).toBe(1);
    expect(isNewerVersion('1.0.0', '1.0.0-beta.1')).toBe(true);
  });

  it('never calls a missing or equal version an update', () => {
    expect(isNewerVersion(null, '1.0.0')).toBe(false);
    expect(isNewerVersion('', '1.0.0')).toBe(false);
    expect(isNewerVersion('1.0.0', '1.0.0')).toBe(false);
  });
});

describe('parseUpdateManifest', () => {
  it('reads the Lumio manifest document', () => {
    expect(
      parseUpdateManifest({
        version: 'v0.24.0',
        releasedAt: '2026-10-30T00:00:00.000Z',
        releaseUrl: 'https://example.com/releases/0.24.0',
        notes: 'เพิ่มระบบอัปเดต',
      }),
    ).toEqual({
      version: '0.24.0',
      releasedAt: '2026-10-30T00:00:00.000Z',
      releaseUrl: 'https://example.com/releases/0.24.0',
      notes: 'เพิ่มระบบอัปเดต',
    });
  });

  it('also reads a GitHub release payload', () => {
    expect(
      parseUpdateManifest({
        tag_name: 'v0.25.0',
        html_url: 'https://github.com/example/lumio/releases/tag/v0.25.0',
        body: 'Fixed things',
        published_at: '2026-11-01T08:00:00Z',
      }),
    ).toMatchObject({ version: '0.25.0', notes: 'Fixed things' });
  });

  it('returns null for a document it cannot understand', () => {
    expect(parseUpdateManifest({ oops: true })).toBeNull();
    expect(parseUpdateManifest(null)).toBeNull();
    expect(updateManifestSchema.safeParse({ version: '  ' }).success).toBe(false);
  });
});

describe('buildUpdateStatus', () => {
  it('reports the installed version even before any check ran', () => {
    expect(buildUpdateStatus('0.23.1')).toEqual({
      currentVersion: '0.23.1',
      latestVersion: null,
      updateAvailable: false,
      checkedAt: null,
      error: null,
      releaseUrl: null,
      notes: null,
      autoUpdate: false,
    });
  });

  it('flags a newer release and keeps both versions for the screen', () => {
    const status = buildUpdateStatus('0.23.1', {
      manifest: { version: '0.24.0', releaseUrl: 'https://example.com/r', notes: 'ใหม่' },
      checkedAt: '2026-10-30T10:00:00.000Z',
      autoUpdate: true,
    });

    expect(status).toMatchObject({
      currentVersion: '0.23.1',
      latestVersion: '0.24.0',
      updateAvailable: true,
      checkedAt: '2026-10-30T10:00:00.000Z',
      autoUpdate: true,
    });
  });

  it('does not offer a downgrade when the manifest is older', () => {
    const status = buildUpdateStatus('0.24.0', { manifest: { version: '0.23.1' } });
    expect(status.updateAvailable).toBe(false);
  });

  it('keeps the error that stopped the check', () => {
    const status = buildUpdateStatus('0.23.1', { error: 'unreachable' });
    expect(status.error).toBe('unreachable');
    expect(status.updateAvailable).toBe(false);
  });
});

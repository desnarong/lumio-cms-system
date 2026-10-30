import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installId, resetInstallId } from './install-id';

describe('installId', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'lumio-install-'));
    vi.stubEnv('LUMIO_DATA_DIR', dir);
    vi.stubEnv('LUMIO_INSTALL_ID', '');
    resetInstallId();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetInstallId();
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates the identity once and reuses it from disk', () => {
    const first = installId();
    resetInstallId();
    const second = installId();

    expect(second).toBe(first);
    expect(JSON.parse(readFileSync(join(dir, 'install.json'), 'utf8'))).toMatchObject({
      id: first,
    });
  });

  it('keeps the file private to the service account', () => {
    installId();

    if (process.platform !== 'win32') {
      expect(statSync(join(dir, 'install.json')).mode & 0o077).toBe(0);
    }
  });

  it('lets the operator pin the identity from the environment', () => {
    vi.stubEnv('LUMIO_INSTALL_ID', 'fixed-install');

    expect(installId()).toBe('fixed-install');
  });
});

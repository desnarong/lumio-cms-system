import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Identity of one Lumio installation, used to bind online licences to a single
 * deployment (docs/design/24-community-licensing.md 24.9). It lives beside the
 * installation key in `<LUMIO_DATA_DIR|.lumio-data>/install.json`, so a restored
 * backup keeps the same identity and does not burn an extra seat.
 *
 * `LUMIO_INSTALL_ID` overrides it for tests and for operators who move an
 * installation between hosts on purpose.
 */

const FILE = 'install.json';
let cached: string | null = null;

const dataDir = (): string => resolve(process.env.LUMIO_DATA_DIR?.trim() || '.lumio-data');

/** Forget the cached value; tests use this after pointing `LUMIO_DATA_DIR` elsewhere. */
export const resetInstallId = (): void => {
  cached = null;
};

export const installId = (): string => {
  const fromEnv = (process.env.LUMIO_INSTALL_ID ?? '').trim();
  if (fromEnv.length > 0) return fromEnv;
  if (cached !== null) return cached;

  const path = join(dataDir(), FILE);
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    const stored =
      parsed !== null && typeof parsed === 'object' ? (parsed as { id?: unknown }).id : undefined;
    if (typeof stored === 'string' && stored.trim().length > 0) {
      cached = stored.trim();
      return cached;
    }
  } catch {
    // No identity yet, or the file is unreadable: mint a new one.
  }

  const created = randomUUID();
  mkdirSync(dataDir(), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ id: created, createdAt: new Date().toISOString() }, null, 2)}\n`, {
    mode: 0o600,
  });
  cached = created;
  return created;
};

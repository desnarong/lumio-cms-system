import type { AuthUser } from '@lumio/shared';

export const SESSION_STORAGE_KEY = 'lumio.session';

export interface StoredSession {
  accessToken: string;
  user: AuthUser;
  /** Site the admin is working on; null right after sign-up, before the wizard. */
  siteId: string | null;
}

export interface SessionStore {
  read(): StoredSession | null;
  write(session: StoredSession): void;
  setSiteId(siteId: string | null): void;
  clear(): void;
}

export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Stand-in for servers and tests, where `localStorage` does not exist. */
export const createMemoryStorage = (): KeyValueStorage => {
  const entries = new Map<string, string>();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
    removeItem: (key) => {
      entries.delete(key);
    },
  };
};

let fallbackStorage: KeyValueStorage | null = null;

const defaultStorage = (): KeyValueStorage => {
  if (typeof localStorage !== 'undefined') return localStorage;
  fallbackStorage ??= createMemoryStorage();
  return fallbackStorage;
};

const isAuthUser = (value: unknown): value is AuthUser => {
  if (value === null || typeof value !== 'object') return false;
  const user = value as Record<string, unknown>;
  return typeof user.id === 'string' && typeof user.email === 'string';
};

/**
 * Keeps the signed-in session in the browser. The refresh token lives in an
 * httpOnly cookie the API sets, so only the short-lived access token is stored
 * here (docs/design/12-api.md 12.5).
 */
export const createSessionStore = (
  storage: KeyValueStorage = defaultStorage(),
): SessionStore => {
  const read = (): StoredSession | null => {
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (typeof parsed.accessToken !== 'string' || !isAuthUser(parsed.user)) return null;
      return {
        accessToken: parsed.accessToken,
        user: parsed.user,
        siteId: typeof parsed.siteId === 'string' ? parsed.siteId : null,
      };
    } catch {
      // A corrupted entry must never block sign-in: treat it as signed out.
      return null;
    }
  };

  return {
    read,
    write: (session) => storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session)),
    setSiteId: (siteId) => {
      const current = read();
      if (current) storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ ...current, siteId }));
    },
    clear: () => storage.removeItem(SESSION_STORAGE_KEY),
  };
};

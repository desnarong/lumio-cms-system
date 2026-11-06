import type { AuthUser } from '@lumio/shared';

export const SESSION_STORAGE_KEY = 'lumio.session';

export interface StoredSession {
  /** Held in memory only; empty after a reload until the first refresh. */
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
 * Keeps the signed-in session in the browser (docs/design/12-api.md 12.5).
 *
 * Only who is signed in and which site they work on are persisted. The access
 * token lives in memory alone, so a script that manages to run on the page
 * cannot lift it from `localStorage`. After a reload the token is empty: the
 * first API call answers 401, `createSessionFetch` trades the httpOnly refresh
 * cookie for a new token and retries, and the admin carries on.
 */
export const createSessionStore = (storage: KeyValueStorage = defaultStorage()): SessionStore => {
  let accessToken = '';

  const persist = (user: AuthUser, siteId: string | null): void =>
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ user, siteId }));

  const read = (): StoredSession | null => {
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (!isAuthUser(parsed.user)) return null;
      const siteId = typeof parsed.siteId === 'string' ? parsed.siteId : null;
      // Entries written before tokens moved to memory still hold one: drop it.
      if ('accessToken' in parsed) persist(parsed.user, siteId);
      return { accessToken, user: parsed.user, siteId };
    } catch {
      // A corrupted entry must never block sign-in: treat it as signed out.
      return null;
    }
  };

  return {
    read,
    write: (session) => {
      accessToken = session.accessToken;
      persist(session.user, session.siteId);
    },
    setSiteId: (siteId) => {
      const current = read();
      if (current) persist(current.user, siteId);
    },
    clear: () => {
      accessToken = '';
      storage.removeItem(SESSION_STORAGE_KEY);
    },
  };
};

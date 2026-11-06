import { describe, expect, it } from 'vitest';
import { SESSION_STORAGE_KEY, createMemoryStorage, createSessionStore } from './session.js';

const session = {
  accessToken: 'access-token',
  user: { id: 'u1', email: 'owner@example.com', name: 'สมชาย', avatarUrl: null },
  siteId: 'site-1',
};

describe('createSessionStore', () => {
  it('round-trips a session', () => {
    const store = createSessionStore(createMemoryStorage());
    store.write(session);

    expect(store.read()).toEqual(session);
  });

  it('starts signed out', () => {
    expect(createSessionStore(createMemoryStorage()).read()).toBeNull();
  });

  it('keeps the site when the wizard finishes', () => {
    const store = createSessionStore(createMemoryStorage());
    store.write({ ...session, siteId: null });
    store.setSiteId('site-2');

    expect(store.read()?.siteId).toBe('site-2');
    expect(store.read()?.accessToken).toBe('access-token');
  });

  it('ignores a site id when nobody is signed in', () => {
    const store = createSessionStore(createMemoryStorage());
    store.setSiteId('site-2');

    expect(store.read()).toBeNull();
  });

  it('treats a corrupted entry as signed out instead of throwing', () => {
    const storage = createMemoryStorage();
    storage.setItem(SESSION_STORAGE_KEY, '{not json');
    expect(createSessionStore(storage).read()).toBeNull();

    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ user: { id: 42 } }));
    expect(createSessionStore(storage).read()).toBeNull();
  });

  it('clears the session on sign out', () => {
    const store = createSessionStore(createMemoryStorage());
    store.write(session);
    store.clear();

    expect(store.read()).toBeNull();
  });

  it('never writes the access token to storage', () => {
    const storage = createMemoryStorage();
    createSessionStore(storage).write(session);

    const raw = storage.getItem(SESSION_STORAGE_KEY) ?? '';
    expect(raw).not.toContain('access-token');
    expect(JSON.parse(raw)).toEqual({ user: session.user, siteId: 'site-1' });
  });

  it('keeps the user signed in across a reload, with the token to be refreshed', () => {
    const storage = createMemoryStorage();
    createSessionStore(storage).write(session);

    // A reload builds a new store over the same storage.
    const reloaded = createSessionStore(storage).read();
    expect(reloaded).toEqual({ ...session, accessToken: '' });
  });

  it('strips a token left by an older build', () => {
    const storage = createMemoryStorage();
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ ...session, accessToken: 'old-token' }));

    expect(createSessionStore(storage).read()?.accessToken).toBe('');
    expect(storage.getItem(SESSION_STORAGE_KEY)).not.toContain('old-token');
  });

  it('forgets the in-memory token on sign out', () => {
    const store = createSessionStore(createMemoryStorage());
    store.write(session);
    store.clear();
    store.write({ ...session, accessToken: '' });

    expect(store.read()?.accessToken).toBe('');
  });
});

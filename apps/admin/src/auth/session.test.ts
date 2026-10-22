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

    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ accessToken: 42 }));
    expect(createSessionStore(storage).read()).toBeNull();
  });

  it('clears the session on sign out', () => {
    const store = createSessionStore(createMemoryStorage());
    store.write(session);
    store.clear();

    expect(store.read()).toBeNull();
  });
});

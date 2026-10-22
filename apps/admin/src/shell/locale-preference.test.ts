import { describe, expect, it, vi } from 'vitest';
import {
  ADMIN_LOCALE_STORAGE_KEY,
  nextAdminLocale,
  readAdminLocale,
  writeAdminLocale,
} from './locale-preference.js';

const storageStub = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
    values,
  };
};

describe('admin locale preference', () => {
  it('answers Thai when nothing was chosen yet', () => {
    expect(readAdminLocale(storageStub())).toBe('th');
    expect(readAdminLocale(null)).toBe('th');
  });

  it('remembers the chosen language per browser', () => {
    const storage = storageStub();

    writeAdminLocale('en', storage);

    expect(storage.setItem).toHaveBeenCalledWith(ADMIN_LOCALE_STORAGE_KEY, 'en');
    expect(readAdminLocale(storage)).toBe('en');
  });

  it('ignores a stored value that is not a language we ship', () => {
    expect(readAdminLocale(storageStub({ [ADMIN_LOCALE_STORAGE_KEY]: 'klingon' }))).toBe('th');
  });

  it('survives storage that refuses to work', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };

    expect(readAdminLocale(broken)).toBe('th');
    expect(() => writeAdminLocale('en', broken)).not.toThrow();
  });

  it('cycles through the languages with one button', () => {
    expect(nextAdminLocale('th')).toBe('en');
    expect(nextAdminLocale('en')).toBe('th');
  });
});
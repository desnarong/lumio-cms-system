import { UI_LOCALES, isUiLocale, type UiLocale } from '@lumio/ui';

/**
 * Language of the back office chrome. It is a user preference, not site data:
 * the same account can work in Thai on one browser and English on another, so it
 * lives in `localStorage` and falls back to Thai (the source language).
 */

export const ADMIN_LOCALE_STORAGE_KEY = 'lumio.admin.locale';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** `localStorage` when the browser allows it, otherwise nothing (tests, SSR). */
const defaultStorage = (): StorageLike | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Private mode can throw on access; a preference is not worth an error.
    return null;
  }
};

export const readAdminLocale = (storage: StorageLike | null = defaultStorage()): UiLocale => {
  try {
    const stored = storage?.getItem(ADMIN_LOCALE_STORAGE_KEY);
    return isUiLocale(stored) ? stored : 'th';
  } catch {
    // A blocked storage (private mode, disabled cookies) means Thai, not a crash.
    return 'th';
  }
};

export const writeAdminLocale = (
  locale: UiLocale,
  storage: StorageLike | null = defaultStorage(),
): void => {
  try {
    storage?.setItem(ADMIN_LOCALE_STORAGE_KEY, locale);
  } catch {
    // A full or blocked storage must not break the screen.
  }
};

/** The next language in the list, for a one-button switcher. */
export const nextAdminLocale = (locale: UiLocale): UiLocale => {
  const index = UI_LOCALES.indexOf(locale);
  return UI_LOCALES[(index + 1) % UI_LOCALES.length] ?? 'th';
};
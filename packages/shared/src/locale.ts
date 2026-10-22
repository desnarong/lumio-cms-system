import { z } from 'zod';

/**
 * The languages themselves (docs/design/17-i18n.md 17.1), kept in a leaf module
 * so `i18n.ts` (which needs pages and paths) and `forms.ts` (which needs to tag
 * a form with a language) can both use it without importing each other.
 */

export const DEFAULT_LOCALE = 'th';

/** Languages the product ships UI and content helpers for. */
export const SUPPORTED_LOCALES = ['th', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  th: 'ไทย',
  en: 'English',
};

export const localeLabel = (locale: string): string =>
  (LOCALE_LABELS as Record<string, string>)[locale] ?? locale.toUpperCase();

export const isSupportedLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);

/** Never trusts a stored/queried locale: anything unknown becomes the default. */
export const normalizeLocale = (value: unknown): Locale =>
  isSupportedLocale(value) ? value : DEFAULT_LOCALE;

/** A language tag from a request or a form field: trimmed, lowercased, bounded. */
export const localeSchema = z
  .string()
  .trim()
  .min(2)
  .max(10)
  .transform((value) => value.toLowerCase());
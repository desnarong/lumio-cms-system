/**
 * The language of an API answer (docs/design/17-i18n.md, 05-admin-ia.md).
 *
 * A few payloads carry wording, not just data: plan names and features, the SEO
 * checklist, App names and the assistant's proposal labels. The admin sends its
 * own UI language as `X-Locale`, so those strings read in the same language as
 * the chrome around them instead of mixing Thai and English on one screen.
 */

export const API_LOCALES = ['th', 'en'] as const;
export type ApiLocale = (typeof API_LOCALES)[number];

export const DEFAULT_API_LOCALE: ApiLocale = 'th';

export const isApiLocale = (value: unknown): value is ApiLocale =>
  typeof value === 'string' && (API_LOCALES as readonly string[]).includes(value);

/** The other language, for the "translate to" wording the assistant builds. */
export const otherApiLocale = (locale: ApiLocale): ApiLocale => (locale === 'en' ? 'th' : 'en');

const acceptedTag = (part: string): string | null => {
  const [rawTag, ...params] = part.split(';');
  const tag = (rawTag ?? '').trim().toLowerCase();
  if (tag.length === 0) return null;

  for (const param of params) {
    const [name, value] = param.split('=');
    if (name?.trim().toLowerCase() === 'q' && Number((value ?? '').trim()) === 0) return null;
  }
  return tag;
};

/**
 * Reads `X-Locale` (preferred, exactly the UI language) or a browser
 * `Accept-Language` header. Anything unknown falls back to Thai, so a malformed
 * header can never make the API answer in a half-known language.
 */
export const resolveApiLocale = (value: string | null | undefined): ApiLocale => {
  if (typeof value !== 'string' || value.trim().length === 0) return DEFAULT_API_LOCALE;

  for (const part of value.split(',')) {
    const tag = acceptedTag(part);
    if (tag === null) continue;
    if (tag === '*') return DEFAULT_API_LOCALE;

    const primary = tag.split('-')[0] ?? '';
    if (isApiLocale(primary)) return primary;
  }
  return DEFAULT_API_LOCALE;
};

/** Chooses the string for a language, falling back to Thai (the source language). */
export const localized = (value: { th: string; en: string }, locale: ApiLocale): string =>
  locale === 'en' ? value.en : value.th;

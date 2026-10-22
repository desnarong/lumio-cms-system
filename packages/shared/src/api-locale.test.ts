import { describe, expect, it } from 'vitest';
import {
  DEFAULT_API_LOCALE,
  isApiLocale,
  localized,
  otherApiLocale,
  resolveApiLocale,
} from './api-locale.js';

describe('resolveApiLocale', () => {
  it('defaults to Thai when the header is missing or unreadable', () => {
    expect(resolveApiLocale(undefined)).toBe(DEFAULT_API_LOCALE);
    expect(resolveApiLocale('')).toBe('th');
    expect(resolveApiLocale('klingon')).toBe('th');
    expect(resolveApiLocale(',,;q=x')).toBe('th');
  });

  it('reads the UI language the admin sends', () => {
    expect(resolveApiLocale('en')).toBe('en');
    expect(resolveApiLocale('EN')).toBe('en');
    expect(resolveApiLocale('th')).toBe('th');
  });

  it('understands a browser Accept-Language list, honouring q=0', () => {
    expect(resolveApiLocale('en-US,en;q=0.9,th;q=0.8')).toBe('en');
    expect(resolveApiLocale('en;q=0,th')).toBe('th');
    expect(resolveApiLocale('*')).toBe('th');
    expect(resolveApiLocale('fr-FR,en-GB;q=0.7')).toBe('en');
  });
});

describe('api locale helpers', () => {
  it('recognises the supported languages', () => {
    expect(isApiLocale('en')).toBe(true);
    expect(isApiLocale('fr')).toBe(false);
  });

  it('picks a string in the requested language', () => {
    expect(localized({ th: 'ไทย', en: 'English' }, 'en')).toBe('English');
    expect(localized({ th: 'ไทย', en: 'English' }, 'th')).toBe('ไทย');
  });

  it('names the other language for "translate to" wording', () => {
    expect(otherApiLocale('th')).toBe('en');
    expect(otherApiLocale('en')).toBe('th');
  });
});

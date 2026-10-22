import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, splitLocalePath } from './locale';

describe('splitLocalePath', () => {
  it('strips a non-default prefix', () => {
    expect(splitLocalePath('/en/about')).toEqual({ locale: 'en', path: '/about', hasPrefix: true });
    expect(splitLocalePath('/en')).toEqual({ locale: 'en', path: '/', hasPrefix: true });
  });

  it('flags a default-language prefix so it can be canonicalised away', () => {
    expect(splitLocalePath('/th/about')).toEqual({ locale: 'th', path: '/about', hasPrefix: true });
  });

  it('passes an un-prefixed path through as the default language', () => {
    expect(splitLocalePath('/posts/beans')).toEqual({
      locale: DEFAULT_LOCALE,
      path: '/posts/beans',
      hasPrefix: false,
    });
  });

  it('ignores a segment that is not an offered language', () => {
    expect(splitLocalePath('/blog/2026')).toEqual({
      locale: DEFAULT_LOCALE,
      path: '/blog/2026',
      hasPrefix: false,
    });
  });
});
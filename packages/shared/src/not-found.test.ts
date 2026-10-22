import { describe, expect, it } from 'vitest';
import { normalizeNotFoundPath } from './not-found.js';

describe('normalizeNotFoundPath', () => {
  it('keeps only the path', () => {
    expect(normalizeNotFoundPath('/promo-2025?utm=fb#x')).toBe('/promo-2025');
    expect(normalizeNotFoundPath(' https://shop.test/old/page ')).toBe('/old/page');
    expect(normalizeNotFoundPath('old')).toBe('/old');
    expect(normalizeNotFoundPath('//a//b/')).toBe('/a/b/');
  });

  it('drops empty and unsafe values', () => {
    expect(normalizeNotFoundPath('   ')).toBeNull();
    expect(normalizeNotFoundPath('/a\u0000b')).toBeNull();
  });

  it('caps very long paths', () => {
    expect(normalizeNotFoundPath(`/${'a'.repeat(900)}`)).toHaveLength(500);
  });
});

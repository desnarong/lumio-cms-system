import { describe, expect, it } from 'vitest';
import { suggestSlug } from './create-slug.js';

describe('suggestSlug', () => {
  it('turns a latin title into a link name', () => {
    expect(suggestSlug('5 Tips For Light', 'post', 0)).toBe('5-tips-for-light');
  });

  it('still gives a Thai title a usable link name', () => {
    expect(suggestSlug('บทความใหม่', 'post', 1_760_000_000_000)).toMatch(/^post-[a-z0-9]+$/);
    expect(suggestSlug('หน้าใหม่ของร้าน', 'page', 1_760_000_000_000)).toMatch(/^page-[a-z0-9]+$/);
  });
});

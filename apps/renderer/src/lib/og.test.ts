import { describe, expect, it } from 'vitest';
import { ogImageUrl } from './og.js';

describe('ogImageUrl', () => {
  it('builds an absolute preview URL with the page and site names', () => {
    const url = new URL(ogImageUrl('https://baandoi.example.com', 'กาแฟบ้านดอย', 'ร้านกาแฟ'));
    expect(url.pathname).toBe('/og');
    expect(url.searchParams.get('title')).toBe('กาแฟบ้านดอย');
    expect(url.searchParams.get('site')).toBe('ร้านกาแฟ');
  });

  it('trims long titles and falls back when empty', () => {
    const long = ogImageUrl('https://shop.test', 'a'.repeat(300), '');
    expect(new URL(long).searchParams.get('title')).toHaveLength(120);
    expect(new URL(long).searchParams.get('title')).toBe('a'.repeat(120));

    const empty = new URL(ogImageUrl('https://shop.test', '   ', 'ร้าน'));
    expect(empty.searchParams.get('title')).toBe('Lumio');
  });
});

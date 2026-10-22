import { describe, expect, it } from 'vitest';
import { isSafeLink, safeLinkSchema } from './links.js';
import { menuItemSchema, parseMenuItems } from './public.js';

describe('isSafeLink', () => {
  it('accepts the link kinds a site actually uses', () => {
    for (const value of [
      '/',
      '/about',
      '#pricing',
      'https://example.com/shop',
      'http://example.com',
      'mailto:hello@example.com',
      'tel:+66812345678',
      '//cdn.example.com/page',
    ]) {
      expect(isSafeLink(value), value).toBe(true);
    }
  });

  it('rejects schemes that execute script or carry a payload', () => {
    for (const value of [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      '  javascript:alert(1)',
      'java\tscript:alert(1)',
      'java\nscript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
    ]) {
      expect(isSafeLink(value), value).toBe(false);
    }
  });

  it('guards the schema so a forged href never reaches the renderer', () => {
    expect(safeLinkSchema.safeParse('/shop').success).toBe(true);
    expect(safeLinkSchema.safeParse('javascript:alert(1)').success).toBe(false);
  });
});

describe('menuItemSchema link safety', () => {
  it('keeps a normal menu item', () => {
    const parsed = menuItemSchema.parse({ label: 'ร้านกาแฟ', href: '/shop', children: [] });
    expect(parsed.href).toBe('/shop');
  });

  it('drops an item whose href would run script', () => {
    const items = parseMenuItems([
      { label: 'ปลอดภัย', href: '/about' },
      { label: 'อันตราย', href: 'javascript:alert(document.cookie)' },
    ]);
    expect(items.map((item) => item.label)).toEqual(['ปลอดภัย']);
  });
});
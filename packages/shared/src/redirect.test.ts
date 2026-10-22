import { describe, expect, it } from 'vitest';
import {
  createRedirectInputSchema,
  normalizeRedirectPath,
  redirectListSchema,
  updateRedirectInputSchema,
} from './redirect.js';

describe('normalizeRedirectPath', () => {
  it('adds the leading slash and removes a trailing one', () => {
    expect(normalizeRedirectPath('old-promo')).toBe('/old-promo');
    expect(normalizeRedirectPath('/old-promo/')).toBe('/old-promo');
    expect(normalizeRedirectPath('  /shop  ')).toBe('/shop');
  });

  it('keeps the home address as a single slash', () => {
    expect(normalizeRedirectPath('/')).toBe('/');
    expect(normalizeRedirectPath('//')).toBe('/');
  });
});

describe('createRedirectInputSchema', () => {
  it('normalises both addresses and defaults to a permanent redirect', () => {
    const parsed = createRedirectInputSchema.parse({
      fromPath: 'promo-2025/',
      toPath: '/promotions',
    });

    expect(parsed).toEqual({ fromPath: '/promo-2025', toPath: '/promotions', code: 301 });
  });

  it('allows an external https target', () => {
    const parsed = createRedirectInputSchema.parse({
      fromPath: '/shop',
      toPath: 'https://shop.example.com',
      code: 302,
    });

    expect(parsed.toPath).toBe('https://shop.example.com');
    expect(parsed.code).toBe(302);
  });

  it('refuses the home page as the old address', () => {
    expect(() => createRedirectInputSchema.parse({ fromPath: '/', toPath: '/home' })).toThrow();
  });

  it('refuses a loop', () => {
    expect(() =>
      createRedirectInputSchema.parse({ fromPath: '/about', toPath: '/about/' }),
    ).toThrow();
  });

  it('refuses query strings, whitespace and web addresses as the old address', () => {
    expect(() =>
      createRedirectInputSchema.parse({ fromPath: '/a?x=1', toPath: '/b' }),
    ).toThrow();
    expect(() =>
      createRedirectInputSchema.parse({ fromPath: '/a b', toPath: '/b' }),
    ).toThrow();
    expect(() =>
      createRedirectInputSchema.parse({ fromPath: 'https://old.example.com', toPath: '/b' }),
    ).toThrow();
  });

  it('refuses code values the renderer does not understand', () => {
    expect(() =>
      createRedirectInputSchema.parse({ fromPath: '/a', toPath: '/b', code: 307 }),
    ).toThrow();
  });
});

describe('updateRedirectInputSchema', () => {
  it('uses the same normalisation as a new rule', () => {
    const parsed = updateRedirectInputSchema.parse({ fromPath: '/a/', toPath: 'b/' });
    expect(parsed).toEqual({ fromPath: '/a', toPath: '/b', code: 301 });
  });
});

describe('redirectListSchema', () => {
  it('accepts the list envelope the API returns', () => {
    const parsed = redirectListSchema.parse({
      items: [
        {
          fromPath: '/a',
          toPath: '/b',
          code: 301,
          createdAt: '2026-10-22T00:00:00.000Z',
          updatedAt: '2026-10-22T00:00:00.000Z',
        },
      ],
    });

    expect(parsed.items).toHaveLength(1);
  });
});

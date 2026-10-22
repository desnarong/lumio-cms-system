import { describe, expect, it } from 'vitest';
import { resolveTrustProxy } from './trust-proxy';

describe('resolveTrustProxy', () => {
  it('defaults to one hop (the Caddy reverse proxy)', () => {
    expect(resolveTrustProxy(undefined)).toBe(1);
    expect(resolveTrustProxy('')).toBe(1);
  });

  it('accepts an explicit hop count', () => {
    expect(resolveTrustProxy('2')).toBe(2);
    expect(resolveTrustProxy('0')).toBe(0);
  });

  it('accepts the boolean strings', () => {
    expect(resolveTrustProxy('true')).toBe(true);
    expect(resolveTrustProxy('false')).toBe(false);
  });

  it('falls back to one hop for junk values', () => {
    expect(resolveTrustProxy('lots')).toBe(1);
    expect(resolveTrustProxy('-3')).toBe(1);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { buildSecurityHeaders, securityHeadersMiddleware } from './security-headers';

describe('buildSecurityHeaders', () => {
  it('sets the baseline headers with a strict CSP', () => {
    const headers = buildSecurityHeaders();

    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Cross-Origin-Resource-Policy']).toBe('cross-origin');
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(headers['Strict-Transport-Security']).toBeUndefined();
  });

  it('adds HSTS only when asked', () => {
    expect(buildSecurityHeaders({ hsts: true })['Strict-Transport-Security']).toBe(
      'max-age=31536000; includeSubDomains',
    );
  });
});

describe('securityHeadersMiddleware', () => {
  it('stamps every header on the response and continues', () => {
    const setHeader = vi.fn();
    const next = vi.fn();

    securityHeadersMiddleware({ hsts: true })({} as never, { setHeader } as never, next);

    expect(setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(setHeader).toHaveBeenCalledWith(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
    expect(next).toHaveBeenCalledOnce();
  });
});

import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy } from './csp';

const directiveOf = (csp: string, name: string): string | undefined =>
  csp.split('; ').find((part) => part.startsWith(`${name} `) || part === name);

describe('buildContentSecurityPolicy', () => {
  it('requires a nonce for scripts in production', () => {
    const csp = buildContentSecurityPolicy({ nonce: 'abc123' });

    expect(directiveOf(csp, 'script-src')).toBe("script-src 'self' 'nonce-abc123'");
  });

  it('keeps the dev runtime working', () => {
    const csp = buildContentSecurityPolicy({ nonce: 'abc123', dev: true });

    expect(directiveOf(csp, 'script-src')).toContain("'unsafe-eval'");
  });

  it('allows the chosen design fonts while keeping scripts locked down', () => {
    const csp = buildContentSecurityPolicy({ nonce: 'n' });

    expect(directiveOf(csp, 'style-src')).toContain('https://fonts.googleapis.com');
    expect(directiveOf(csp, 'font-src')).toContain('https://fonts.gstatic.com');
  });

  it('blocks framing, objects and base tag abuse', () => {
    const csp = buildContentSecurityPolicy({ nonce: 'n' });

    expect(directiveOf(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directiveOf(csp, 'object-src')).toBe("object-src 'none'");
    expect(directiveOf(csp, 'base-uri')).toBe("base-uri 'self'");
  });
});

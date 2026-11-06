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

  it('serves the design fonts from this origin only', () => {
    const csp = buildContentSecurityPolicy({ nonce: 'n' });

    expect(directiveOf(csp, 'style-src')).toBe("style-src 'self' 'unsafe-inline'");
    expect(directiveOf(csp, 'font-src')).toBe("font-src 'self' data:");
  });

  it('lets checkout redirect to the payment providers and nowhere else', () => {
    const formAction = directiveOf(buildContentSecurityPolicy({ nonce: 'n' }), 'form-action');

    expect(formAction).toBe(
      "form-action 'self' https://checkout.stripe.com https://*.bangkokbank.com",
    );
    expect(formAction).not.toMatch(/\*\s|https:(\s|$)/);
  });

  it('blocks framing, objects and base tag abuse', () => {
    const csp = buildContentSecurityPolicy({ nonce: 'n' });

    expect(directiveOf(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directiveOf(csp, 'object-src')).toBe("object-src 'none'");
    expect(directiveOf(csp, 'base-uri')).toBe("base-uri 'self'");
  });
});

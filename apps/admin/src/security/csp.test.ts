import { describe, expect, it } from 'vitest';
import { sampleAppDocument } from '../growth/AppSandbox';
import { SAMPLE_APP_SCRIPT } from '../growth/sample-app-script';
import {
  adminSecurityHeaders,
  buildAdminCsp,
  nginxHeaderSnippet,
  originOf,
  parseOriginList,
  scriptHashSource,
} from './csp';

const directive = (csp: string, name: string): string[] =>
  (csp.split('; ').find((part) => part.startsWith(`${name} `)) ?? '').split(' ').slice(1);

describe('admin CSP', () => {
  it('only runs the admin bundle and the hashed inline scripts', () => {
    const csp = buildAdminCsp({ scriptHashes: ["'sha256-abc'"] });
    expect(directive(csp, 'script-src')).toEqual(["'self'", "'sha256-abc'"]);
    expect(csp).not.toContain("'unsafe-eval'");
    expect(directive(csp, 'script-src')).not.toContain("'unsafe-inline'");
  });

  it('refuses framing, plugins and foreign form targets', () => {
    const csp = buildAdminCsp();
    expect(directive(csp, 'frame-ancestors')).toEqual(["'none'"]);
    expect(directive(csp, 'object-src')).toEqual(["'none'"]);
    expect(directive(csp, 'base-uri')).toEqual(["'self'"]);
    expect(directive(csp, 'form-action')).toEqual(["'self'"]);
  });

  it('lets the admin call its API origin and nothing else', () => {
    const csp = buildAdminCsp({ apiUrl: 'https://api.example.com/v1' });
    expect(directive(csp, 'connect-src')).toEqual(["'self'", 'https://api.example.com']);
  });

  it('talks to nobody in demo mode', () => {
    expect(directive(buildAdminCsp({ apiUrl: '' }), 'connect-src')).toEqual(["'self'"]);
  });

  it('adds extra origins to images and requests without duplicates', () => {
    const csp = buildAdminCsp({
      apiUrl: 'http://localhost:49100',
      extraOrigins: ['http://localhost:49600', 'http://localhost:49100'],
    });
    expect(directive(csp, 'connect-src')).toEqual([
      "'self'",
      'http://localhost:49100',
      'http://localhost:49600',
    ]);
    expect(directive(csp, 'img-src')).toContain('http://localhost:49600');
  });

  it('only accepts http(s) origins', () => {
    expect(originOf('javascript:alert(1)')).toBeNull();
    expect(originOf('not a url')).toBeNull();
    expect(originOf(' https://cdn.example.com/a/b ')).toBe('https://cdn.example.com');
    expect(parseOriginList('https://a.example.com, data:x  http://b.test:8080/x')).toEqual([
      'https://a.example.com',
      'http://b.test:8080',
    ]);
  });
});

describe('admin security headers', () => {
  it('sends the hardening headers alongside the CSP', () => {
    const headers = adminSecurityHeaders();
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
  });

  it('renders Nginx add_header lines that survive error pages', () => {
    const snippet = nginxHeaderSnippet({ 'X-Test': 'a "quoted" value' });
    expect(snippet).toBe('add_header X-Test "a \\"quoted\\" value" always;\n');
  });
});

describe('demo App script', () => {
  it('hashes to a stable sha256 source', async () => {
    const source = await scriptHashSource('alert(1)');
    // echo -n 'alert(1)' | openssl dgst -sha256 -binary | base64
    expect(source).toBe("'sha256-bhHHL3z2vDgxUt0W3dWQOrprscmda2Y5pLsLg4GF+pI='");
  });

  it('embeds exactly the hashed script, so the inherited CSP lets it run', () => {
    const html = sampleAppDocument('Demo', ['contents.list']);
    expect(html).toContain(`<script>${SAMPLE_APP_SCRIPT}</script>`);
  });

  it('escapes text spliced into the document', () => {
    const html = sampleAppDocument('<img src=x onerror=alert(1)>', []);
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});

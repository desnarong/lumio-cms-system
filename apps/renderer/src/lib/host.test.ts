import { describe, expect, it } from 'vitest';
import { resolveRequestHost, siteOrigin } from './host';

describe('resolveRequestHost', () => {
  it('prefers x-forwarded-host because the CDN terminates the request', () => {
    expect(resolveRequestHost('baandoi.lumio.app', 'renderer:49200')).toBe('baandoi.lumio.app');
  });

  it('takes the first entry of a forwarded chain', () => {
    expect(resolveRequestHost('baandoi.lumio.app, proxy', null)).toBe('baandoi.lumio.app');
  });

  it('falls back to the Host header', () => {
    expect(resolveRequestHost(null, 'baandoicoffee.com')).toBe('baandoicoffee.com');
  });

  it('falls back to localhost when nothing is set', () => {
    expect(resolveRequestHost(undefined, undefined)).toBe('localhost:49200');
  });
});

describe('siteOrigin', () => {
  it('uses https for real domains', () => {
    expect(siteOrigin('baandoi.lumio.app')).toBe('https://baandoi.lumio.app');
  });

  it('uses http for loopback so local preview links work', () => {
    expect(siteOrigin('localhost:49200')).toBe('http://localhost:49200');
    expect(siteOrigin('127.0.0.1:49200')).toBe('http://127.0.0.1:49200');
  });
});

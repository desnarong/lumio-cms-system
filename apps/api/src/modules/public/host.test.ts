import { describe, expect, it } from 'vitest';
import { isLoopbackHost, normalizeHost, rootDomain, subdomainOf } from './host';

describe('normalizeHost', () => {
  it('lowercases and drops the port', () => {
    expect(normalizeHost('Baandoi.Lumio.App:49200')).toBe('baandoi.lumio.app');
  });

  it('keeps IPv6 hosts intact', () => {
    expect(normalizeHost('[::1]:49200')).toBe('[::1]');
  });

  it('drops a trailing dot', () => {
    expect(normalizeHost('example.com.')).toBe('example.com');
  });
});

describe('subdomainOf', () => {
  it('reads the free subdomain', () => {
    expect(subdomainOf('baandoi.lumio.app', 'lumio.app')).toBe('baandoi');
  });

  it('ignores custom domains and the root domain itself', () => {
    expect(subdomainOf('baandoicoffee.com', 'lumio.app')).toBeNull();
    expect(subdomainOf('lumio.app', 'lumio.app')).toBeNull();
  });

  it('ignores nested hosts so a lookalike cannot claim a tenant', () => {
    expect(subdomainOf('evil.baandoi.lumio.app', 'lumio.app')).toBeNull();
  });
});

describe('isLoopbackHost', () => {
  it('accepts localhost, 127.0.0.1 and ::1 only', () => {
    expect(isLoopbackHost('localhost')).toBe(true);
    expect(isLoopbackHost('127.0.0.1')).toBe(true);
    expect(isLoopbackHost('::1')).toBe(true);
    expect(isLoopbackHost('baandoi.lumio.app')).toBe(false);
  });
});

describe('rootDomain', () => {
  it('reads PUBLIC_ROOT_DOMAIN with a lumio.app default', () => {
    const previous = process.env.PUBLIC_ROOT_DOMAIN;
    delete process.env.PUBLIC_ROOT_DOMAIN;
    expect(rootDomain()).toBe('lumio.app');
    process.env.PUBLIC_ROOT_DOMAIN = 'Example.COM';
    expect(rootDomain()).toBe('example.com');
    if (previous === undefined) delete process.env.PUBLIC_ROOT_DOMAIN;
    else process.env.PUBLIC_ROOT_DOMAIN = previous;
  });
});

import { describe, expect, it } from 'vitest';
import { isLoopbackHost, normalizeHost, rootDomain, subdomainOf } from './host';

describe('normalizeHost', () => {
  it('lowercases and drops the port', () => {
    expect(normalizeHost('Baandoi.Example.Com:49200')).toBe('baandoi.example.com');
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
    expect(subdomainOf('baandoi.example.com', 'example.com')).toBe('baandoi');
  });

  it('ignores custom domains and the root domain itself', () => {
    expect(subdomainOf('baandoicoffee.com', 'example.com')).toBeNull();
    expect(subdomainOf('example.com', 'example.com')).toBeNull();
  });

  it('ignores nested hosts so a lookalike cannot claim a tenant', () => {
    expect(subdomainOf('evil.baandoi.example.com', 'example.com')).toBeNull();
  });
});

describe('isLoopbackHost', () => {
  it('accepts localhost, 127.0.0.1 and ::1 only', () => {
    expect(isLoopbackHost('localhost')).toBe(true);
    expect(isLoopbackHost('127.0.0.1')).toBe(true);
    expect(isLoopbackHost('::1')).toBe(true);
    expect(isLoopbackHost('baandoi.example.com')).toBe(false);
  });
});

describe('rootDomain', () => {
  it('reads PUBLIC_ROOT_DOMAIN with a example.com default', () => {
    const previous = process.env.PUBLIC_ROOT_DOMAIN;
    delete process.env.PUBLIC_ROOT_DOMAIN;
    expect(rootDomain()).toBe('example.com');
    process.env.PUBLIC_ROOT_DOMAIN = 'Example.COM';
    expect(rootDomain()).toBe('example.com');
    if (previous === undefined) delete process.env.PUBLIC_ROOT_DOMAIN;
    else process.env.PUBLIC_ROOT_DOMAIN = previous;
  });
});

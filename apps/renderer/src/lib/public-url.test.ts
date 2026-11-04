import { describe, expect, it } from 'vitest';
import { publicOrigin, publicUrl } from './public-url';

const internal = 'http://localhost:49200/cart/add';

const requestWith = (headers: Record<string, string>): Request =>
  new Request(internal, { method: 'POST', headers });

describe('publicOrigin', () => {
  it('uses the host and scheme the proxy forwarded', () => {
    const headers = new Headers({
      'x-forwarded-host': 'baandoi.example.com',
      'x-forwarded-proto': 'https',
    });
    expect(publicOrigin(headers, internal)).toBe('https://baandoi.example.com');
  });

  it('falls back to the Host header, then to the internal origin', () => {
    expect(publicOrigin(new Headers({ host: 'shop.test:8080' }), internal)).toBe(
      'http://shop.test:8080',
    );
    expect(publicOrigin(new Headers(), internal)).toBe('http://localhost:49200');
  });

  it('takes the first entry of a proxy chain', () => {
    const headers = new Headers({ 'x-forwarded-host': 'a.example.com, internal:1' });
    expect(publicOrigin(headers, internal)).toBe('http://a.example.com');
  });

  it('ignores a host that is not a plain host name', () => {
    const headers = new Headers({ 'x-forwarded-host': 'evil.com/path?x=1' });
    expect(publicOrigin(headers, internal)).toBe('http://localhost:49200');
  });

  it('ignores a scheme it does not know', () => {
    const headers = new Headers({
      'x-forwarded-host': 'a.example.com',
      'x-forwarded-proto': 'javascript',
    });
    expect(publicOrigin(headers, internal)).toBe('http://a.example.com');
  });
});

describe('publicUrl', () => {
  it('puts a path on the public site', () => {
    const request = requestWith({ 'x-forwarded-host': 'baandoi.example.com' });
    expect(publicUrl('/checkout?error=1', request).href).toBe(
      'http://baandoi.example.com/checkout?error=1',
    );
  });

  it('keeps an absolute address such as a Stripe page', () => {
    const request = requestWith({ 'x-forwarded-host': 'baandoi.example.com' });
    expect(publicUrl('https://checkout.stripe.com/c/pay/cs_test_1', request).href).toBe(
      'https://checkout.stripe.com/c/pay/cs_test_1',
    );
  });
});

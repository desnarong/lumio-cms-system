import { describe, expect, it } from 'vitest';
import { decideRevalidate } from './revalidate';

const SECRET = 'shared-secret';

describe('decideRevalidate', () => {
  it('rejects a request without the shared secret', () => {
    expect(decideRevalidate({ secret: SECRET, provided: null, body: { paths: ['/'] } })).toEqual({
      ok: false,
      reason: 'forbidden',
    });
    expect(decideRevalidate({ secret: SECRET, provided: 'wrong', body: { paths: ['/'] } })).toEqual({
      ok: false,
      reason: 'forbidden',
    });
  });

  it('rejects everything when the renderer has no secret configured', () => {
    expect(
      decideRevalidate({ secret: undefined, provided: SECRET, body: { paths: ['/'] } }),
    ).toEqual({ ok: false, reason: 'forbidden' });
  });

  it('rejects a secret of a different length without leaking timing', () => {
    expect(
      decideRevalidate({ secret: SECRET, provided: `${SECRET}-longer`, body: { paths: ['/'] } }),
    ).toEqual({ ok: false, reason: 'forbidden' });
    expect(
      decideRevalidate({ secret: SECRET, provided: 'shared', body: { paths: ['/'] } }),
    ).toEqual({ ok: false, reason: 'forbidden' });
  });

  it('accepts same-origin absolute paths only', () => {
    expect(
      decideRevalidate({
        secret: SECRET,
        provided: SECRET,
        body: { paths: ['/about', 'https://evil.test/x', '//evil.test', 'about', 42] },
      }),
    ).toEqual({ ok: true, paths: ['/about'] });
  });

  it('de-duplicates and caps the batch', () => {
    const paths = Array.from({ length: 150 }, (_value, index) => `/page-${index}`).concat(['/page-0']);
    const decision = decideRevalidate({ secret: SECRET, provided: SECRET, body: { paths } });

    expect(decision.ok).toBe(true);
    if (!decision.ok) return;
    expect(decision.paths).toHaveLength(100);
    expect(new Set(decision.paths).size).toBe(100);
  });

  it('rejects a body without usable paths', () => {
    expect(decideRevalidate({ secret: SECRET, provided: SECRET, body: {} })).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(decideRevalidate({ secret: SECRET, provided: SECRET, body: null })).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('accepts a host so only that site cache is cleared', () => {
    const decision = decideRevalidate({
      secret: SECRET,
      provided: SECRET,
      body: { paths: ['/'], host: 'Baandoi.Example.Com' },
    });

    expect(decision).toEqual({ ok: true, paths: ['/'], host: 'baandoi.example.com' });
  });

  it('drops a host that is not a plain hostname', () => {
    const decision = decideRevalidate({
      secret: SECRET,
      provided: SECRET,
      body: { paths: ['/'], host: 'https://evil.test/' },
    });

    expect(decision).toEqual({ ok: true, paths: ['/'] });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bearerToken, signReaderToken, verifyReaderToken } from './reader-token';

const SITE_ID = '00000000-0000-4000-8000-0000000000c1';
const READER_ID = '00000000-0000-4000-8000-0000000000d1';

beforeEach(() => {
  vi.stubEnv('READER_SECRET', 'a-test-secret-at-least-16-chars');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('reader token', () => {
  it('round-trips the reader and the site it belongs to', () => {
    const { token } = signReaderToken(READER_ID, SITE_ID);
    expect(verifyReaderToken(token)).toEqual({ readerId: READER_ID, siteId: SITE_ID });
  });

  it('expires, so a stolen cookie does not live forever', () => {
    const now = Date.now();
    const { token } = signReaderToken(READER_ID, SITE_ID, 60, now);
    expect(verifyReaderToken(token, now + 30_000)).not.toBeNull();
    expect(verifyReaderToken(token, now + 120_000)).toBeNull();
  });

  it('refuses a tampered payload or signature', () => {
    const { token } = signReaderToken(READER_ID, SITE_ID);
    const [payload, signature] = token.split('.');
    const otherPayload = Buffer.from(`${READER_ID}.${SITE_ID}.9999999999`).toString('base64url');

    expect(verifyReaderToken(`${otherPayload}.${signature}`)).toBeNull();
    expect(verifyReaderToken(`${payload}.${'a'.repeat(43)}`)).toBeNull();
    expect(verifyReaderToken('not-a-token')).toBeNull();
  });

  it('fails closed when no secret is configured', () => {
    vi.stubEnv('READER_SECRET', '');
    vi.stubEnv('JWT_ACCESS_SECRET', '');
    expect(() => signReaderToken(READER_ID, SITE_ID)).toThrow(/READER_SECRET/);
    expect(verifyReaderToken('anything.anything')).toBeNull();
  });

  it('reads only a bearer header', () => {
    expect(bearerToken('Bearer abc')).toBe('abc');
    expect(bearerToken('bearer abc')).toBe('abc');
    expect(bearerToken('Basic abc')).toBeNull();
    expect(bearerToken(undefined)).toBeNull();
  });
});

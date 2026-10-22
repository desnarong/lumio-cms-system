import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signPreviewToken, verifyPreviewToken } from './preview-token';

const CONTENT = '11111111-1111-4111-8111-111111111111';
const SITE = '22222222-2222-4222-8222-222222222222';
const KEY = 'preview-secret-for-tests';
const NOW = Date.parse('2026-10-22T03:00:00Z');

beforeAll(() => {
  process.env.PREVIEW_SECRET = KEY;
});

afterAll(() => {
  delete process.env.PREVIEW_SECRET;
});

describe('preview tokens', () => {
  it('round-trips the content and site ids', () => {
    const { token, expiresAt } = signPreviewToken(CONTENT, SITE, 600, NOW);
    expect(expiresAt.toISOString()).toBe('2026-10-22T03:10:00.000Z');
    expect(verifyPreviewToken(token, NOW)).toEqual({ contentId: CONTENT, siteId: SITE });
  });

  it('rejects an expired token', () => {
    const { token } = signPreviewToken(CONTENT, SITE, 600, NOW);
    expect(verifyPreviewToken(token, NOW + 601_000)).toBeNull();
  });

  it('rejects a tampered payload', () => {
    const { token } = signPreviewToken(CONTENT, SITE, 600, NOW);
    const [encoded, signature] = token.split('.') as [string, string];
    const forged = Buffer.from(`${CONTENT}.${SITE}.9999999999`, 'utf8').toString('base64url');
    expect(verifyPreviewToken(`${forged}.${signature}`, NOW)).toBeNull();
    expect(verifyPreviewToken(`${encoded}.${signature.slice(0, -2)}xx`, NOW)).toBeNull();
  });

  it('rejects a token signed with another secret', () => {
    const { token } = signPreviewToken(CONTENT, SITE, 600, NOW);
    process.env.PREVIEW_SECRET = 'another-secret-value';
    expect(verifyPreviewToken(token, NOW)).toBeNull();
    process.env.PREVIEW_SECRET = KEY;
  });

  it('refuses to mint a token without a secret', () => {
    delete process.env.PREVIEW_SECRET;
    delete process.env.JWT_ACCESS_SECRET;
    expect(() => signPreviewToken(CONTENT, SITE)).toThrow(/PREVIEW_SECRET/);
    process.env.PREVIEW_SECRET = KEY;
  });
});

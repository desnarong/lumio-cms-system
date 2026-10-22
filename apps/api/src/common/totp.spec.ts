import { describe, expect, it } from 'vitest';
import {
  base32Decode,
  base32Encode,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  otpauthUrl,
  totpCode,
  verifyTotp,
} from './totp';

describe('base32', () => {
  it('round-trips and matches the RFC 4648 sample', () => {
    const raw = Buffer.from('12345678901234567890', 'ascii');
    expect(base32Encode(raw)).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    expect(base32Decode('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ').toString('ascii')).toBe(
      '12345678901234567890',
    );
    expect(base32Encode(Buffer.from('f', 'ascii'))).toBe('MY');
  });

  it('ignores spaces and lowercase, so a typed secret still works', () => {
    expect(base32Decode('gezd gnbv gy3t qojq').length).toBeGreaterThan(0);
  });
});

describe('totpCode', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

  it('matches the RFC 6238 test vectors (SHA-1, 8 digits)', () => {
    expect(totpCode(secret, 59_000, 8)).toBe('94287082');
    expect(totpCode(secret, 1_111_111_109_000, 8)).toBe('07081804');
    expect(totpCode(secret, 1_111_111_111_000, 8)).toBe('14050471');
    expect(totpCode(secret, 1_234_567_890_000, 8)).toBe('89005924');
  });

  it('answers six digits by default, zero-padded', () => {
    const code = totpCode(secret, 59_000);
    expect(code).toMatch(/^\d{6}$/);
    expect(code).toBe('287082');
  });
});

describe('verifyTotp', () => {
  const secret = generateTotpSecret();
  const now = 1_700_000_000_000;

  it('accepts the current code and one step either side', () => {
    expect(verifyTotp(secret, totpCode(secret, now), now)).toBe(true);
    expect(verifyTotp(secret, totpCode(secret, now - 30_000), now)).toBe(true);
    expect(verifyTotp(secret, totpCode(secret, now + 30_000), now)).toBe(true);
  });

  it('refuses a code from far outside the window and junk input', () => {
    expect(verifyTotp(secret, totpCode(secret, now - 120_000), now)).toBe(false);
    expect(verifyTotp(secret, '12345', now)).toBe(false);
    expect(verifyTotp(secret, 'abcdef', now)).toBe(false);
  });
});

describe('recovery codes', () => {
  it('makes unique, readable codes and stores only their hashes', () => {
    const codes = generateRecoveryCodes(10);
    expect(new Set(codes).size).toBe(10);
    expect(codes[0]).toMatch(/^[A-Z2-7]{4}-[A-Z2-7]{4}$/);
    expect(hashRecoveryCode(codes[0]!)).toHaveLength(64);
    expect(hashRecoveryCode('abcd efgh')).toBe(hashRecoveryCode('ABCD-EFGH'));
  });
});

describe('otpauthUrl', () => {
  it('describes the account for an authenticator app', () => {
    const url = otpauthUrl({ secret: 'GEZDGNBV', account: 'owner@example.com' });

    expect(url.startsWith('otpauth://totp/')).toBe(true);
    expect(url).toContain('secret=GEZDGNBV');
    expect(url).toContain('issuer=Lumio');
    expect(url).toContain('digits=6');
    expect(url).toContain('period=30');
    expect(url).toContain(encodeURIComponent('Lumio:owner@example.com'));
  });
});

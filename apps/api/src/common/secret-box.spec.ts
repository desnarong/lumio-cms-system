import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, isEncryptedSecret } from './secret-box';

const KEY = 'install-wide-test-key';

describe('secret box', () => {
  it('round-trips a secret without keeping the plaintext', () => {
    const sealed = encryptSecret('client-secret', KEY);

    expect(sealed.startsWith('enc:v1:')).toBe(true);
    expect(sealed).not.toContain('client-secret');
    expect(isEncryptedSecret(sealed)).toBe(true);
    expect(decryptSecret(sealed, KEY)).toBe('client-secret');
  });

  it('produces a different ciphertext on every call', () => {
    expect(encryptSecret('same', KEY)).not.toBe(encryptSecret('same', KEY));
  });

  it('refuses to encrypt without an installation key', () => {
    expect(() => encryptSecret('client-secret', '')).toThrow('SECRETS_ENCRYPTION_KEY');
  });

  it('refuses to decrypt with a different key', () => {
    const sealed = encryptSecret('client-secret', KEY);

    expect(() => decryptSecret(sealed, 'another-key')).toThrow();
  });

  it('detects a tampered payload instead of returning garbage', () => {
    const sealed = encryptSecret('client-secret', KEY);
    const [iv, tag, data] = sealed.slice('enc:v1:'.length).split('.');
    const tampered = `enc:v1:${iv}.${tag}.${data?.slice(0, -2)}AA`;

    expect(() => decryptSecret(tampered, KEY)).toThrow();
  });

  it('refuses a plaintext value left by an older build', () => {
    expect(() => decryptSecret('client-secret', KEY)).toThrow('กรุณากรอก Client Secret ใหม่');
  });

  it('refuses to decrypt without an installation key', () => {
    const sealed = encryptSecret('client-secret', KEY);

    expect(() => decryptSecret(sealed, '')).toThrow('SECRETS_ENCRYPTION_KEY');
  });
});

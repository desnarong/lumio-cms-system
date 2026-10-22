import { describe, expect, it } from 'vitest';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const passwords = new PasswordService();

  it('hashes a password so the plain text is not recoverable', async () => {
    const hashed = await passwords.hash('lumio-demo-1234');
    expect(hashed).not.toContain('lumio-demo-1234');
    expect(hashed.startsWith('$argon2id$')).toBe(true);
  });

  it('accepts the correct password', async () => {
    const hashed = await passwords.hash('lumio-demo-1234');
    await expect(passwords.verify('lumio-demo-1234', hashed)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hashed = await passwords.hash('lumio-demo-1234');
    await expect(passwords.verify('wrong-password', hashed)).resolves.toBe(false);
  });

  it('returns false for a malformed hash instead of throwing', async () => {
    await expect(passwords.verify('anything', 'not-a-hash')).resolves.toBe(false);
  });
});

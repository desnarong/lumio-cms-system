import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ApiException } from './api-error';

/**
 * Encryption for secrets that site owners type into the admin, such as a bank
 * Client Secret (docs/design/15-security.md 15.4). One installation-wide key
 * (`SECRETS_ENCRYPTION_KEY`) wraps every tenant secret, so the database alone is
 * never enough to call a shop's bank.
 *
 * AES-256-GCM gives confidentiality *and* tamper detection: a rotated, wrong or
 * edited value fails closed instead of quietly sending a bad secret to the bank.
 * The stored string is `enc:v1:<iv>.<tag>.<ciphertext>` in base64url, which is
 * also how a future version can be told apart from today's.
 */

const PREFIX = 'enc:v1:';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

const KEY_FILE = 'secrets.key';
let generatedKey: string | null = null;

/** Folder that holds the key when the operator did not set the env variable. */
export const secretsKeyDir = (): string =>
  resolve(process.env.LUMIO_DATA_DIR ?? '.lumio-data');

/**
 * The installation key. An operator may set `SECRETS_ENCRYPTION_KEY`, but a
 * fresh install must work with no .env at all, so the first time a secret is
 * saved we generate a 32-byte key and keep it in `<data dir>/secrets.key`
 * (mode 0600). Restoring a backup without that file means tenant secrets must
 * be typed in again; the key itself is never returned by the API.
 */
const generatedSecretsKey = (): string => {
  if (generatedKey !== null) return generatedKey;

  const path = join(secretsKeyDir(), KEY_FILE);
  try {
    const existing = readFileSync(path, 'utf8').trim();
    if (existing.length >= 32) {
      generatedKey = existing;
      return existing;
    }
  } catch {
    // No key yet: create one below.
  }

  const created = randomBytes(32).toString('base64url');
  mkdirSync(secretsKeyDir(), { recursive: true });
  writeFileSync(path, created, { mode: 0o600 });
  generatedKey = created;
  return created;
};

export const secretsKey = (): string => {
  const fromEnv = (process.env.SECRETS_ENCRYPTION_KEY ?? '').trim();
  return fromEnv.length > 0 ? fromEnv : generatedSecretsKey();
};

const missingKey = (): ApiException =>
  ApiException.conflict(
    'ยังไม่ได้ตั้งค่ากุญแจเข้ารหัสของระบบ (SECRETS_ENCRYPTION_KEY) จึงบันทึกข้อมูลเชื่อมต่อธนาคารไม่ได้',
  );

/** Any passphrase becomes a 32-byte key; the operator never has to invent bytes. */
const keyFor = (secret: string): Buffer => createHash('sha256').update(secret, 'utf8').digest();

export const isEncryptedSecret = (value: string): boolean => value.startsWith(PREFIX);

export const encryptSecret = (plain: string, key: string = secretsKey()): string => {
  if (key.length === 0) throw missingKey();
  if (plain.length === 0) throw ApiException.validation('ข้อมูลลับว่างไม่ได้');

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, keyFor(key), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`;
};

export const decryptSecret = (payload: string, key: string = secretsKey()): string => {
  if (!isEncryptedSecret(payload)) {
    throw ApiException.conflict(
      'ข้อมูลเชื่อมต่อธนาคารถูกบันทึกไม่ถูกต้อง กรุณากรอก Client Secret ใหม่อีกครั้ง',
    );
  }
  if (key.length === 0) throw missingKey();

  const [ivText, tagText, dataText] = payload.slice(PREFIX.length).split('.');
  if (!ivText || !tagText || !dataText) {
    throw ApiException.conflict(
      'ข้อมูลเชื่อมต่อธนาคารเสียหาย กรุณากรอก Client Secret ใหม่อีกครั้ง',
    );
  }

  try {
    const decipher = createDecipheriv(ALGORITHM, keyFor(key), Buffer.from(ivText, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataText, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw ApiException.conflict(
      'ถอดรหัสข้อมูลเชื่อมต่อธนาคารไม่สำเร็จ กรุณากรอก Client Secret ใหม่อีกครั้ง',
    );
  }
};

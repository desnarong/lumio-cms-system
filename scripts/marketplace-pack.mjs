#!/usr/bin/env node
/**
 * Signs one marketplace pack manifest with the vendor private key, producing the
 * `lumio_pack_v1.<payload>.<signature>` token an owner pastes into
 * เติบโต › ตลาดบล็อก (docs/PROGRESS.md "ก้อนถัดไป B").
 *
 *   node scripts/marketplace-pack.mjs --key ../.lumio-vendor-keys/lumio-marketplace-private.pem \
 *     --file ./my-pack.json --out ./my-pack.lumio
 *
 * The manifest must follow docs/design/16-apps.md: version 1, a `key` in
 * kebab-case, a semver `version`, and sections built only from the blocks Lumio
 * ships. The API validates all of that again after checking this signature.
 */
import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (name, fallback = '') => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? (args[index + 1] ?? fallback) : fallback;
};

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const keyPath = flag('key');
const filePath = flag('file');
if (!keyPath) fail('ต้องระบุ --key <private-key.pem>');
if (!filePath) fail('ต้องระบุ --file <pack.json>');

let manifest;
try {
  manifest = JSON.parse(readFileSync(resolve(filePath), 'utf8'));
} catch {
  fail('อ่านไฟล์แพ็กไม่สำเร็จ หรือไฟล์ไม่ใช่ JSON');
}

if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) {
  fail('ไฟล์แพ็กต้องเป็น JSON object');
}
if (manifest.v !== 1) fail('แพ็กต้องระบุ "v": 1');
if (typeof manifest.key !== 'string' || !/^[a-z0-9][a-z0-9-]{1,63}$/.test(manifest.key)) {
  fail('"key" ต้องเป็น a-z, 0-9 และขีดกลาง (2–64 ตัวอักษร)');
}
if (typeof manifest.version !== 'string' || !/^\d+\.\d+\.\d+/.test(manifest.version)) {
  fail('"version" ต้องอยู่ในรูป 1.2.3');
}
if (!Array.isArray(manifest.sections) || manifest.sections.length === 0) {
  fail('แพ็กต้องมี "sections" อย่างน้อยหนึ่งส่วน');
}

const segment = Buffer.from(JSON.stringify(manifest), 'utf8').toString('base64url');
const signingInput = `lumio_pack_v1.${segment}`;
const signature = sign(
  null,
  Buffer.from(signingInput, 'utf8'),
  createPrivateKey(readFileSync(resolve(keyPath))),
);
const token = `${signingInput}.${signature.toString('base64url')}`;

const out = flag('out');
if (out) writeFileSync(resolve(out), `${token}\n`, { mode: 0o600 });
console.log(token);
console.error(
  `ลงลายเซ็นแพ็ก ${manifest.key}@${manifest.version} · ${manifest.sections.length} ส่วน`,
);

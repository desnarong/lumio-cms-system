#!/usr/bin/env node
/**
 * Issues one Lumio licence token with the vendor private key
 * (docs/design/24-community-licensing.md).
 *
 *   node scripts/license-issue.mjs --key ./lumio-license-private.pem \
 *     --sub "บริษัท ตัวอย่าง จำกัด" --features membership,marketplace --seats 5 --days 365
 *
 * The token is printed on stdout. It is not stored anywhere here.
 */
import { createPrivateKey, sign } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FEATURES = new Set(['membership', 'marketplace']);

const args = process.argv.slice(2);
const flag = (name, fallback = '') => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? (args[index + 1] ?? fallback) : fallback;
};
const has = (name) => args.includes(`--${name}`);

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const keyPath = flag('key');
const subject = flag('sub').trim();
if (!keyPath) fail('ต้องระบุ --key <private-key.pem>');
if (!subject) fail('ต้องระบุ --sub "ชื่อผู้ถือไลเซนส์"');

const plan = flag('plan', 'pro');
if (plan !== 'pro' && plan !== 'business') fail('--plan ต้องเป็น pro หรือ business');

const requested = flag('features')
  .split(',')
  .map((entry) => entry.trim())
  .filter(Boolean);
for (const feature of requested) {
  if (!FEATURES.has(feature)) fail(`ไม่รู้จักฟีเจอร์ "${feature}" (มี: ${[...FEATURES].join(', ')})`);
}

const seatsRaw = flag('seats');
const seats = seatsRaw.length === 0 ? null : Number(seatsRaw);
if (seats !== null && (!Number.isInteger(seats) || seats < 1)) fail('--seats ต้องเป็นจำนวนเต็มบวก');

const iat = Math.floor(Date.now() / 1000);
const exp = has('perpetual') ? null : iat + Number(flag('days', '365')) * 86_400;

const payload = {
  v: 1,
  sub: subject,
  plan,
  features: requested,
  ...(seats !== null ? { seats } : {}),
  iat,
  exp,
};

const segment = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
const signingInput = `lumio_lic_v1.${segment}`;
const privateKey = createPrivateKey(readFileSync(resolve(keyPath)));
const signature = sign(null, Buffer.from(signingInput, 'utf8'), privateKey);
const token = `${signingInput}.${signature.toString('base64url')}`;

const out = flag('out');
if (out) writeFileSync(resolve(out), `${token}\n`, { mode: 0o600 });
console.log(token);
console.error(`ออกไลเซนส์ให้ ${subject} · ฟีเจอร์: ${requested.join(', ') || '(ไม่มี)'} · หมดอายุ: ${exp ? new Date(exp * 1000).toISOString() : 'ตลอดชีพ'}`);

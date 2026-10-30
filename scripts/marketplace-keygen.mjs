#!/usr/bin/env node
/**
 * Creates the Ed25519 key pair used to sign marketplace packs
 * (docs/design/24-community-licensing.md 24.6.1). Run this on a trusted
 * machine, keep the private key offline, and bake only the printed public key
 * into `apps/api/src/modules/marketplace/marketplace.keys.ts`.
 *
 *   node scripts/marketplace-keygen.mjs [private-key-path]
 *
 * The default target sits next to the checkout, not inside it: a key in the
 * project folder rides along with any zip/rsync/backup of the repo, even when
 * `.gitignore` keeps it out of git.
 */
import { generateKeyPairSync } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(
  process.argv[2] ?? resolve(repoRoot, '..', '.lumio-vendor-keys', 'lumio-marketplace-private.pem'),
);

if (target === repoRoot || target.startsWith(repoRoot + sep)) {
  console.error(`ปฏิเสธการเขียนกุญแจลงในรีโป: ${target}`);
  console.error('เลือกพาธนอกรีโป เช่น ../.lumio-vendor-keys/lumio-marketplace-private.pem');
  process.exit(1);
}

const pair = generateKeyPairSync('ed25519');
const publicKey = pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
const privatePem = pair.privateKey.export({ format: 'pem', type: 'pkcs8' });

writeFileSync(target, privatePem, { mode: 0o600, flag: 'wx' });

console.log(publicKey);
console.log('');
console.log('^^ Public key — paste into marketplace.keys.ts');
console.log(`Private key written to ${target}`);
console.log('Keep it offline. Never commit it: scripts/marketplace-pack.mjs signs packs with it.');

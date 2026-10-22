#!/usr/bin/env node
/**
 * Creates the vendor key pair for Lumio licences (docs/design/24-community-licensing.md).
 * Run this on a trusted machine, keep the private key offline, and bake only the
 * printed public key into `apps/api/src/modules/license/license.keys.ts`.
 *
 *   node scripts/license-keygen.mjs [private-key-path]
 */
import { generateKeyPairSync } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const target = resolve(process.argv[2] ?? 'lumio-license-private.pem');
const pair = generateKeyPairSync('ed25519');
const publicKey = pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
const privatePem = pair.privateKey.export({ format: 'pem', type: 'pkcs8' });

writeFileSync(target, privatePem, { mode: 0o600 });

console.log(publicKey);
console.log('');
console.log('^^ Public key — paste into license.keys.ts');
console.log(`Private key written to ${target}`);
console.log('Keep it offline. Never commit it, and back it up: a lost key cannot reissue licences.');

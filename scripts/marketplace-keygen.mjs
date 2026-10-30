#!/usr/bin/env node
/**
 * Creates the Ed25519 key pair used to sign marketplace packs
 * (docs/design/24-community-licensing.md 24.6.1). Run this on a trusted
 * machine, keep the private key offline, and bake only the printed public key
 * into `apps/api/src/modules/marketplace/marketplace.keys.ts`.
 *
 *   node scripts/marketplace-keygen.mjs [private-key-path]
 */
import { generateKeyPairSync } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const target = resolve(process.argv[2] ?? 'lumio-marketplace-private.pem');
const pair = generateKeyPairSync('ed25519');
const publicKey = pair.publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
const privatePem = pair.privateKey.export({ format: 'pem', type: 'pkcs8' });

writeFileSync(target, privatePem, { mode: 0o600 });

console.log(publicKey);
console.log('');
console.log('^^ Public key — paste into marketplace.keys.ts');
console.log(`Private key written to ${target}`);
console.log('Keep it offline. Never commit it: scripts/marketplace-pack.mjs signs packs with it.');

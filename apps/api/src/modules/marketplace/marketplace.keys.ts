/**
 * The vendor's Ed25519 public key for block packs, baked into release builds.
 *
 * Format: base64 of the SPKI DER bytes (`openssl pkey -pubout -outform DER`).
 * The release pipeline replaces this empty string with the real key, so a
 * deployment can verify a vendor-signed pack without trusting operator env.
 * A key baked here always wins; `MARKETPLACE_PUBLIC_KEY` is read only when
 * this constant is empty (a dev or fork build with no vendor key).
 *
 * The private key never enters this repository: see
 * docs/design/24-community-licensing.md 24.6.1 and scripts/marketplace-keygen.mjs.
 */
export const MARKETPLACE_PUBLIC_KEY =
  'MCowBQYDK2VwAyEAaSHnG8LGYyPp8epStlZwUViE/dHOAMTnHcc9ZHO3fuw=';

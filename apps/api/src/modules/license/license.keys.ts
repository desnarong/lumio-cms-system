/**
 * The vendor's Ed25519 public key, baked into release builds.
 *
 * Format: base64 of the SPKI DER bytes (`openssl pkey -pubout -outform DER`).
 * The release pipeline replaces this empty string with the real key, so a
 * Community build can verify a purchased licence without trusting operator env.
 * A key baked here always wins; `LUMIO_LICENSE_PUBLIC_KEY` is read only when
 * this constant is empty (a dev or fork build with no vendor key).
 *
 * The private key never enters this repository: see
 * docs/design/24-community-licensing.md.
 */
export const LICENSE_PUBLIC_KEY =
  'MCowBQYDK2VwAyEAVyu9OblDoaF9FyjMVRvwIcYBHcqRgpBUfKeFzcVUqMY=';

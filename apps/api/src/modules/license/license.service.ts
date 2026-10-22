import { createPublicKey, verify as verifySignature, type KeyObject } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { LICENSE_PUBLIC_KEY } from './license.keys';
import {
  communityStatus,
  isLicenseExpired,
  licenseCoversFeature,
  licenseStatusOfPayload,
  parseLicenseToken,
  type LicenseFeature,
  type LicenseStatus,
} from '@lumio/shared';

/**
 * Verifies the deployment licence (docs/design/24-community-licensing.md).
 *
 * The token is Ed25519-signed by the vendor; this build only holds the public
 * key, so it can prove a licence but never mint one. Everything runs offline:
 * a Community installation keeps working with no network and no call home.
 */
@Injectable()
export class LicenseService {
  private readonly logger = new Logger(LicenseService.name);
  private cachedKey: KeyObject | null | undefined;

  /** The token the operator installed with `LUMIO_LICENSE`. */
  token(): string {
    return (process.env.LUMIO_LICENSE ?? '').trim();
  }

  /** Public key from `LUMIO_LICENSE_PUBLIC_KEY` (base64 SPKI DER or PEM). */
  private publicKey(): KeyObject | null {
    if (this.cachedKey !== undefined) return this.cachedKey;

    // Production trusts only the key baked into the build; the env override is a
    // development convenience and would otherwise let anyone mint a licence.
    const override = process.env.NODE_ENV === 'production' ? '' : (process.env.LUMIO_LICENSE_PUBLIC_KEY ?? '');
    const raw = (override || LICENSE_PUBLIC_KEY).trim();
    if (raw.length === 0) {
      this.cachedKey = null;
      return null;
    }

    try {
      this.cachedKey = raw.includes('-----BEGIN')
        ? createPublicKey(raw)
        : createPublicKey({ key: Buffer.from(raw, 'base64'), format: 'der', type: 'spki' });
    } catch (error) {
      // A broken key must not unlock paid features; it is a configuration error,
      // so it is logged once and every licence then reads as invalid.
      this.logger.warn(`อ่านกุญแจไลเซนส์ไม่สำเร็จ: ${String(error)}`);
      this.cachedKey = null;
    }
    return this.cachedKey;
  }

  /** Verifies one token without trusting its contents. */
  verifyToken(token: string): LicenseStatus {
    const parsed = parseLicenseToken(token);
    if (!parsed.ok) return communityStatus(parsed.reason);

    const key = this.publicKey();
    if (!key) return communityStatus('no_public_key');

    let signatureOk = false;
    try {
      signatureOk = verifySignature(
        null,
        Buffer.from(parsed.parsed.signingInput, 'utf8'),
        key,
        Buffer.from(parsed.parsed.signature),
      );
    } catch {
      signatureOk = false;
    }
    if (!signatureOk) return communityStatus('bad_signature');
    if (isLicenseExpired(parsed.parsed.payload)) return communityStatus('expired');

    return licenseStatusOfPayload(parsed.parsed.payload);
  }

  /** Status of the installed licence; Community when nothing is installed. */
  status(): LicenseStatus {
    const token = this.token();
    if (token.length === 0) return communityStatus('missing');
    return this.verifyToken(token);
  }

  /** True when the installed licence unlocks a paid capability. */
  hasFeature(feature: LicenseFeature): boolean {
    return licenseCoversFeature(this.status(), feature);
  }
}

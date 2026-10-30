import { createPublicKey, verify as verifySignature, type KeyObject } from 'node:crypto';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { hostname } from 'node:os';
import { join, resolve } from 'node:path';
import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { LICENSE_PUBLIC_KEY } from './license.keys';
import { installId } from '../../common/install-id';
import {
  communityStatus,
  isLeaseForOtherInstall,
  isLicenseExpired,
  licenseCoversFeature,
  licenseStatusOfPayload,
  parseLicenseToken,
  type LicenseFeature,
  type LicenseSource,
  type LicenseStatus,
} from '@lumio/shared';

/** Renewal cadence and the offline window that keeps a site up during an outage. */
const DEFAULT_REFRESH_HOURS = 6;
const DEFAULT_GRACE_DAYS = 14;
const ACTIVATE_PATH = '/api/activate';
const LEASE_FILE = 'license-lease.json';
const LEASE_TIMEOUT_MS = 5000;

interface LeaseRecord {
  token: string;
  installId: string;
  fetchedAt: string;
}

interface ActivateReply {
  token?: unknown;
  reason?: unknown;
}

const numberFromEnv = (name: string, fallback: number, min: number, max: number): number => {
  const raw = (process.env[name] ?? '').trim();
  if (raw.length === 0) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
};

/**
 * Verifies the deployment licence (docs/design/24-community-licensing.md).
 *
 * Two kinds of token exist. An `offline` licence stands on its own: the Ed25519
 * signature and its expiry are enough, and the installation never phones home.
 * An `online` licence only earns the right to fetch a short-lived lease that is
 * bound to this installation; renewing that lease is what enforces seat limits
 * and lets the vendor revoke a licence. When the vendor is unreachable the last
 * lease keeps working for `LUMIO_LICENSE_GRACE_DAYS`.
 */
@Injectable()
export class LicenseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LicenseService.name);
  private cachedKey: KeyObject | null | undefined;
  private inflight: Promise<LicenseStatus> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private leaseCache: { record: LeaseRecord | null; at: number } | null = null;
  /** The token installed from the admin and kept in the database. */
  private storedToken = '';
  private storedAt: string | null = null;

  /**
   * The long-lived token in force. `LUMIO_LICENSE` wins so an operator can
   * override a bad install from the deployment config; otherwise the token the
   * owner pasted in ตั้งค่า › ไลเซนส์ is used.
   */
  token(): string {
    const fromEnv = (process.env.LUMIO_LICENSE ?? '').trim();
    return fromEnv.length > 0 ? fromEnv : this.storedToken;
  }

  /** Where that token came from, for the admin screen. */
  source(): LicenseSource {
    if ((process.env.LUMIO_LICENSE ?? '').trim().length > 0) return 'env';
    return this.storedToken.length > 0 ? 'database' : 'none';
  }

  /** When the stored licence was installed; null for env and Community. */
  installedAt(): string | null {
    return this.source() === 'database' ? this.storedAt : null;
  }

  /**
   * Called by the store after it reads or writes the row. The value is kept in
   * memory because feature checks run on every request and cannot await the
   * database.
   */
  setStoredToken(token: string, installedAt: string | null = null): void {
    this.storedToken = token.trim();
    this.storedAt = this.storedToken.length > 0 ? installedAt : null;
  }

  /** Base URL of the vendor licence server; empty when the site stays offline. */
  serverUrl(): string {
    return (process.env.LUMIO_LICENSE_SERVER ?? '').trim().replace(/\/+$/, '');
  }

  private refreshHours(): number {
    return numberFromEnv('LUMIO_LICENSE_REFRESH_HOURS', DEFAULT_REFRESH_HOURS, 1, 168);
  }

  private graceMs(): number {
    return numberFromEnv('LUMIO_LICENSE_GRACE_DAYS', DEFAULT_GRACE_DAYS, 0, 365) * 86_400_000;
  }

  /**
   * Fetch a lease now. Falls back to the current status when the site is
   * offline, so a failed renewal never locks a working installation mid-request.
   */
  async refresh(): Promise<LicenseStatus> {
    const server = this.serverUrl();
    const token = this.token();
    if (server.length === 0 || token.length === 0) return this.status();
    // Only an online licence ever phones home; an offline one is complete in
    // itself and asking the desk about it would just log a warning every cycle.
    const parsed = parseLicenseToken(token);
    if (!parsed.ok || (parsed.parsed.payload.mode ?? 'offline') !== 'online') return this.status();
    if (this.inflight !== null) return this.inflight;

    this.inflight = this.activate(server, token).finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async activate(server: string, token: string): Promise<LicenseStatus> {
    const thisInstall = installId();
    try {
      const response = await fetch(`${server}${ACTIVATE_PATH}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token,
          installId: thisInstall,
          host: hostname(),
          version: (process.env.LUMIO_VERSION ?? '').trim(),
        }),
        signal: AbortSignal.timeout(LEASE_TIMEOUT_MS),
      });
      const body = (await response.json().catch(() => null)) as ActivateReply | null;
      const leaseToken = typeof body?.token === 'string' ? body.token.trim() : '';
      if (!response.ok || leaseToken.length === 0) {
        const reason = typeof body?.reason === 'string' ? body.reason : `http_${response.status}`;
        this.logger.warn(`ต่ออายุไลเซนส์ไม่สำเร็จ (${reason}) — ยังใช้สิทธิ์เดิมตามช่วงผ่อนผัน`);
        return this.status();
      }

      const verified = this.verifyToken(leaseToken);
      if (!verified.valid || !verified.bound) {
        this.logger.warn(`เซิร์ฟเวอร์ไลเซนส์ส่งโทเคนที่ใช้ไม่ได้ (${verified.reason})`);
        return this.status();
      }

      this.saveLease({ token: leaseToken, installId: thisInstall, fetchedAt: new Date().toISOString() });
      this.logger.log(`ต่ออายุไลเซนส์แล้ว ถึง ${verified.expiresAt ?? 'ไม่ระบุ'}`);
      return verified;
    } catch (error) {
      this.logger.warn(`ติดต่อเซิร์ฟเวอร์ไลเซนส์ไม่ได้: ${String(error)}`);
      return this.status();
    }
  }

  onModuleInit(): void {
    this.startRenewal();
  }

  /**
   * Begin the renewal loop. The store calls this once it has loaded the token
   * from the database, so a licence installed from the admin is leased at boot
   * even when `LUMIO_LICENSE` is empty. Safe to call more than once.
   */
  startRenewal(): void {
    if (this.timer !== null) return;
    if (this.serverUrl().length === 0 || this.token().length === 0) return;

    void this.refresh();
    this.timer = setInterval(() => void this.refresh(), this.refreshHours() * 3_600_000);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  /** Status of the installed licence; Community when nothing is installed. */
  status(): LicenseStatus {
    let leaseProblem: LicenseStatus | null = null;
    const lease = this.readLease();
    if (lease !== null) {
      if (lease.installId !== installId()) {
        // A copied data folder: the lease belongs to another installation.
        this.dropLease();
      } else {
        const leased = this.verifyToken(lease.token);
        if (leased.valid) return leased;
        leaseProblem = leased;
        if (leased.reason !== 'expired') this.dropLease();
      }
    }

    const token = this.token();
    if (token.length === 0) return leaseProblem ?? communityStatus('missing');
    const installed = this.verifyToken(token);
    // An online token never proves anything by itself, so the lease failure is
    // the honest answer (expired, revoked, wrong install).
    if (!installed.valid && installed.reason === 'not_activated' && leaseProblem !== null) {
      return leaseProblem;
    }
    return installed;
  }

  /** True when the installed licence unlocks a paid capability. */
  hasFeature(feature: LicenseFeature): boolean {
    return licenseCoversFeature(this.status(), feature);
  }

  /** Verifies one token without trusting its contents. */
  verifyToken(token: string): LicenseStatus {
    const parsed = parseLicenseToken(token);
    if (!parsed.ok) return communityStatus(parsed.reason);

    const payload = parsed.parsed.payload;
    const mode = payload.mode ?? 'offline';
    if (mode === 'online' && typeof payload.inst !== 'string') {
      // A renewal token proves nothing on its own; the site needs a lease.
      return communityStatus('not_activated');
    }
    if (isLeaseForOtherInstall(payload, installId())) {
      return communityStatus('wrong_install');
    }

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

    if (isLicenseExpired(payload)) {
      const expiresMs = (payload.exp ?? 0) * 1000;
      const grace = this.graceMs();
      if (typeof payload.inst === 'string' && grace > 0 && expiresMs + grace > Date.now()) {
        return { ...licenseStatusOfPayload(payload), reason: 'grace' };
      }
      return communityStatus('expired');
    }

    return licenseStatusOfPayload(payload);
  }

  /** Public key from `LICENSE_PUBLIC_KEY`; env only fills a build that ships none. */
  private publicKey(): KeyObject | null {
    if (this.cachedKey !== undefined) return this.cachedKey;

    // A key baked into the build always wins. Trusting the env first let anyone
    // run with `NODE_ENV=development`, supply their own key and mint a licence.
    // The fallback stays for builds that carry no vendor key at all.
    const baked = LICENSE_PUBLIC_KEY.trim();
    const fromEnv = (process.env.LUMIO_LICENSE_PUBLIC_KEY ?? '').trim();
    if (baked.length > 0 && fromEnv.length > 0) {
      this.logger.warn('เพิกเฉย LUMIO_LICENSE_PUBLIC_KEY: บิลด์นี้ฝังกุญแจของผู้ขายไว้แล้ว');
    }
    const raw = baked.length > 0 ? baked : fromEnv;
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

  private leasePath(): string {
    const dir = resolve(process.env.LUMIO_DATA_DIR?.trim() || '.lumio-data');
    return join(dir, LEASE_FILE);
  }

  private readLease(): LeaseRecord | null {
    const nowMs = Date.now();
    if (this.leaseCache !== null && nowMs - this.leaseCache.at < 5000) {
      return this.leaseCache.record;
    }
    const record = this.readLeaseFile();
    this.leaseCache = { record, at: nowMs };
    return record;
  }

  private readLeaseFile(): LeaseRecord | null {
    try {
      const parsed: unknown = JSON.parse(readFileSync(this.leasePath(), 'utf8'));
      if (parsed === null || typeof parsed !== 'object') return null;
      const record = parsed as Partial<LeaseRecord>;
      if (typeof record.token !== 'string' || typeof record.installId !== 'string') return null;
      return {
        token: record.token,
        installId: record.installId,
        fetchedAt: typeof record.fetchedAt === 'string' ? record.fetchedAt : '',
      };
    } catch {
      return null;
    }
  }

  private saveLease(record: LeaseRecord): void {
    const dir = resolve(process.env.LUMIO_DATA_DIR?.trim() || '.lumio-data');
    mkdirSync(dir, { recursive: true });
    writeFileSync(this.leasePath(), `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600 });
    this.leaseCache = { record, at: Date.now() };
  }

  private dropLease(): void {
    // A lease that no longer proves anything is removed; the next successful
    // activation writes a fresh one.
    this.leaseCache = { record: null, at: Date.now() };
    try {
      unlinkSync(this.leasePath());
    } catch {
      // Nothing stored, or a read-only data folder: both are fine.
    }
  }
}

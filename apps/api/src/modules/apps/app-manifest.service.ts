import { lookup } from 'node:dns/promises';
import { Injectable } from '@nestjs/common';
import {
  EXTERNAL_APP_MANIFEST_MAX_BYTES,
  assertFetchableManifestUrl,
  externalAppManifestSchema,
  externalAppPreviewSchema,
  isPrivateHostname,
  resolveExternalAppLinks,
  type ExternalAppManifest,
  type ExternalAppPreview,
} from '@lumio/shared';
import { ApiException } from '../../common/api-error';
import {
  APPS_MANIFEST_MAX_REDIRECTS,
  appsAllowHttpManifest,
  appsManifestTimeoutMs,
} from './apps.config';

export type ManifestFetch = typeof fetch;
export type ManifestLookup = (
  hostname: string,
  options: { all: true },
) => Promise<{ address: string; family: number }[]>;

export interface ManifestDeps {
  fetchImpl?: ManifestFetch;
  lookupImpl?: ManifestLookup;
  allowHttp?: boolean;
  timeoutMs?: number;
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * Refuses names that resolve to the machine the API runs on or to the private
 * network. Checking the literal hostname is not enough: an attacker can point a
 * public DNS name at 10.0.0.1, so every address must be public too.
 */
const assertPublicResolution = async (
  hostname: string,
  lookupImpl: ManifestLookup,
): Promise<void> => {
  if (isPrivateHostname(hostname)) {
    throw ApiException.validation('manifest ต้องอยู่บนโฮสต์สาธารณะ');
  }

  const literal = /^[\d.]+$/.test(hostname) || hostname.includes(':');
  if (literal) return;

  let addresses: { address: string; family: number }[];
  try {
    addresses = await lookupImpl(hostname, { all: true });
  } catch {
    throw ApiException.validation('หาโฮสต์ของ manifest ไม่พบ');
  }
  if (addresses.length === 0 || addresses.some((entry) => isPrivateHostname(entry.address))) {
    throw ApiException.validation('manifest ต้องอยู่บนโฮสต์สาธารณะ');
  }
};

const readManifestJson = async (raw: string): Promise<unknown> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw ApiException.validation('ไฟล์ manifest ไม่ใช่ JSON ที่ถูกต้อง');
  }
  return parsed;
};

/**
 * Downloads and validates a developer-hosted manifest. Every hop is checked
 * against the public-network rule, the response is capped, and the whole request
 * times out, so a pasted URL can never be used to read internal services or to
 * park an API worker on a slow server (docs/design/15-security.md 15.3).
 */
export const fetchExternalManifest = async (
  rawUrl: string,
  deps: ManifestDeps = {},
): Promise<ExternalAppPreview> => {
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch;
  const lookupImpl = deps.lookupImpl ?? lookup;
  const allowHttp = deps.allowHttp ?? appsAllowHttpManifest();
  const timeoutMs = deps.timeoutMs ?? appsManifestTimeoutMs();

  let current = assertFetchableManifestUrl(rawUrl, { allowHttp });

  for (let hop = 0; hop <= APPS_MANIFEST_MAX_REDIRECTS; hop += 1) {
    await assertPublicResolution(current.hostname, lookupImpl);

    let response: Response;
    try {
      response = await fetchImpl(current, {
        redirect: 'manual',
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw ApiException.validation('โหลด manifest ไม่สำเร็จ กรุณาตรวจที่อยู่แล้วลองใหม่');
    }

    if (REDIRECT_STATUSES.has(response.status)) {
      const location = response.headers.get('location');
      if (!location) throw ApiException.validation('manifest ตอบกลับการเปลี่ยนที่อยู่ที่ไม่สมบูรณ์');
      current = assertFetchableManifestUrl(new URL(location, current).toString(), { allowHttp });
      continue;
    }

    if (!response.ok) {
      throw ApiException.validation(`โหลด manifest ไม่สำเร็จ (สถานะ ${response.status})`);
    }

    const declaredLength = Number(response.headers.get('content-length') ?? '0');
    if (Number.isFinite(declaredLength) && declaredLength > EXTERNAL_APP_MANIFEST_MAX_BYTES) {
      throw ApiException.validation('manifest ใหญ่เกินไป');
    }

    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > EXTERNAL_APP_MANIFEST_MAX_BYTES) {
      throw ApiException.validation('manifest ใหญ่เกินไป');
    }

    const parsed = externalAppManifestSchema.safeParse(await readManifestJson(text));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path.join('.') ?? '';
      throw ApiException.validation(
        issue ? `manifest ไม่ถูกต้องที่ ${field || 'ไฟล์'}: ${issue.message}` : 'manifest ไม่ถูกต้อง',
      );
    }

    const links = resolveExternalAppLinks(parsed.data, current.toString(), { allowHttp });
    return externalAppPreviewSchema.parse({
      manifestUrl: current.toString(),
      entry: links.entry,
      manifest: parsed.data satisfies ExternalAppManifest,
    });
  }

  throw ApiException.validation('manifest เปลี่ยนที่อยู่หลายครั้งเกินไป');
};

@Injectable()
export class AppManifestService {
  /** Fetches and validates one manifest; the caller decides who may install it. */
  async preview(url: string): Promise<ExternalAppPreview> {
    return fetchExternalManifest(url);
  }
}

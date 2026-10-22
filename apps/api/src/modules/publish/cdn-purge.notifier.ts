import { createHmac } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';

export const CDN_PURGE_FETCH = 'lumio:cdn-purge-fetch';

/** The slice of `fetch` this module needs, so tests can pass a stub. */
export type PurgeFetchLike = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<{ ok: boolean; status: number }>;

/** The part of a site's publishing setup this step needs. */
export interface CdnPurgeConfig {
  cdnPurgeUrl: string;
  cdnPurgeSecret: string;
}

export interface CdnPurgeResult {
  /** The CDN accepted the purge. */
  delivered: boolean;
  /** Nothing to do: no purge URL configured, no host, or no paths. */
  skipped: boolean;
  status: number | null;
}

/**
 * Asks the CDN to drop the pages a publish touched
 * (docs/design/18-deployment.md 18.7, 10-architecture.md 10.4). The renderer
 * rebuilds HTML first; this is the second half for deployments that cache the
 * public files at the edge.
 *
 * The purge address and key are saved by the site owner in ตั้งค่า › การเผยแพร่,
 * so neither needs a `.env` entry. Without an address every call is a no-op.
 */
@Injectable()
export class CdnPurgeNotifier {
  private readonly logger = new Logger(CdnPurgeNotifier.name);

  constructor(@Inject(CDN_PURGE_FETCH) private readonly fetchImpl: PurgeFetchLike) {}

  async purge(
    config: CdnPurgeConfig,
    host: string | null,
    paths: string[],
  ): Promise<CdnPurgeResult> {
    const url = config.cdnPurgeUrl.trim();
    if (url.length === 0 || !host || paths.length === 0) {
      return { delivered: false, skipped: true, status: null };
    }

    const body = JSON.stringify({ host, paths });
    const signature = createHmac('sha256', config.cdnPurgeSecret)
      .update(body)
      .digest('hex');

    try {
      const response = await this.fetchImpl(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-lumio-purge-signature': signature,
        },
        body,
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) {
        this.logger.warn(`CDN purge answered ${response.status} for ${host}`);
      }
      return { delivered: response.ok, skipped: false, status: response.status };
    } catch (error) {
      // A publish must not fail because the edge cache is unreachable; the next
      // publish (or the CDN's own TTL) will catch up.
      this.logger.warn(`CDN purge call failed for ${host}: ${String(error)}`);
      return { delivered: false, skipped: false, status: null };
    }
  }
}

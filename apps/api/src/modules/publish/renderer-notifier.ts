import { Inject, Injectable, Logger } from '@nestjs/common';

export const RENDERER_FETCH = 'lumio:renderer-fetch';

/** The slice of `fetch` this module needs, so tests can pass a stub. */
export type FetchLike = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<{ ok: boolean; status: number }>;

export interface RevalidateResult {
  /** The renderer accepted the request and rebuilt the paths. */
  delivered: boolean;
  /** Nothing to do: no renderer configured, or no paths to rebuild. */
  skipped: boolean;
  status: number | null;
}

export interface RevalidateOptions {
  /** The site's own renderer address (ตั้งค่า › การเผยแพร่); falls back to env. */
  rendererUrl?: string;
  /** Inter-service secret; the renderer validates the same value. */
  secret?: string;
}

/**
 * Tells the renderer (Next.js ISR) to rebuild the pages a publish touched
 * (docs/design/10-architecture.md 10.4 step "invalidate cache"). The API never
 * renders public HTML itself; it only asks the renderer to do it.
 *
 * The address can come from the site's publishing settings, so the customer
 * fills it in once in the admin instead of editing `.env` on the server.
 */
@Injectable()
export class RendererNotifier {
  private readonly logger = new Logger(RendererNotifier.name);

  constructor(@Inject(RENDERER_FETCH) private readonly fetchImpl: FetchLike) {}

  async revalidate(
    paths: string[],
    host?: string,
    options: RevalidateOptions = {},
  ): Promise<RevalidateResult> {
    const base = (options.rendererUrl ?? process.env.RENDERER_URL ?? '')
      .trim()
      .replace(/\/+$/, '');
    if (base.length === 0 || paths.length === 0) {
      return { delivered: false, skipped: true, status: null };
    }

    try {
      const response = await this.fetchImpl(`${base}/api/revalidate`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-lumio-revalidate-secret':
            options.secret ?? process.env.REVALIDATE_SECRET ?? '',
        },
        body: JSON.stringify({ paths, ...(host ? { host } : {}) }),
        signal: AbortSignal.timeout(10_000),
      });
      return { delivered: response.ok, skipped: false, status: response.status };
    } catch (error) {
      this.logger.warn(`Revalidate call failed: ${String(error)}`);
      return { delivered: false, skipped: false, status: null };
    }
  }
}

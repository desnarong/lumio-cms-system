import { createHmac } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { PUBLISH_TARGET_MS } from '@lumio/shared';

export const STATIC_PUBLISH_FETCH = 'lumio:static-publish-fetch';

/** The slice of `fetch` this module needs, so tests can pass a stub. */
export type StaticFetchLike = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  },
) => Promise<{ ok: boolean; status: number; text?: () => Promise<string>; headers?: { get(name: string): string | null } }>;

/** The part of a site's publishing setup this step needs. */
export interface StaticPublishConfig {
  rendererUrl: string;
  staticPublishUrl: string;
  staticPublishSecret: string;
}

export interface StaticPublishResult {
  /** Every page was fetched from the renderer and accepted by the CDN. */
  delivered: boolean;
  skipped: boolean;
  /** Addresses that failed; the publish job only logs them. */
  failures: string[];
  /** Wall-clock time for the whole batch, shown on the settings screen. */
  durationMs: number;
}

/** Pages are independent HTTP calls, so writing a few at once is safe. */
const MAX_CONCURRENCY = 6;
/** One renderer fetch plus one upload may take this long each, at most. */
const REQUEST_TIMEOUT_MS = 8_000;
/** Leaves a margin for queueing/response handling inside the 10-second target. */
const BATCH_BUDGET_MS = PUBLISH_TARGET_MS - 1_000;

/**
 * Writes the HTML the renderer just built to the static host, so the CDN can
 * serve pure static pages instead of a live renderer (docs/design/10-architecture.md
 * 10.4 step 3, 03-scope.md "Publish แล้วได้ static HTML บน CDN").
 *
 * The address and signing key belong to the site (ตั้งค่า › การเผยแพร่), not to
 * the deployment: the owner pastes them in the admin, so no `.env` edit is
 * needed before publishing. `staticPublishUrl` receives `{ host, path, html }`
 * signed with `x-lumio-signature` (the same HMAC format as the shop webhook).
 * Without a configured address the step is a no-op and ISR remains the live
 * path.
 *
 * Pages are written concurrently under one 10-second budget, because a publish
 * is supposed to reach the CDN within 10 seconds (03-scope.md Definition of
 * Done) instead of taking ten seconds per page.
 */
@Injectable()
export class StaticPublisher {
  private readonly logger = new Logger(StaticPublisher.name);

  constructor(@Inject(STATIC_PUBLISH_FETCH) private readonly fetchImpl: StaticFetchLike) {}

  async publish(
    config: StaticPublishConfig,
    host: string | null,
    paths: string[],
  ): Promise<StaticPublishResult> {
    const target = config.staticPublishUrl.trim();
    const renderer = config.rendererUrl.replace(/\/+$/, '');
    const queue = [...new Set(paths)].slice(0, 50);
    const started = Date.now();

    if (target.length === 0 || renderer.length === 0 || !host || queue.length === 0) {
      return { delivered: false, skipped: true, failures: [], durationMs: 0 };
    }

    const deadline = started + BATCH_BUDGET_MS;
    const failures: string[] = [];
    let cursor = 0;

    const worker = async (): Promise<void> => {
      for (;;) {
        const index = cursor;
        cursor += 1;
        if (index >= queue.length) return;

        const path = queue[index] as string;
        const remaining = deadline - Date.now();
        if (remaining <= 0) {
          failures.push(path);
          continue;
        }

        try {
          const written = await this.writeOne(config, renderer, target, host, path, remaining);
          if (!written) failures.push(path);
        } catch (error) {
          failures.push(path);
          this.logger.warn(`ส่งหน้า ${path} ขึ้น CDN ไม่สำเร็จ: ${String(error)}`);
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(MAX_CONCURRENCY, queue.length) }, () => worker()),
    );

    return {
      delivered: failures.length === 0,
      skipped: false,
      failures,
      durationMs: Date.now() - started,
    };
  }

  private async writeOne(
    config: StaticPublishConfig,
    renderer: string,
    target: string,
    host: string,
    path: string,
    budgetMs: number,
  ): Promise<boolean> {
    const timeout = Math.max(1, Math.min(REQUEST_TIMEOUT_MS, budgetMs));

    const page = await this.fetchImpl(`${renderer}${path}`, {
      headers: { accept: 'text/html', 'x-forwarded-host': host },
      signal: AbortSignal.timeout(timeout),
    });
    if (!page.ok) return false;

    const html = page.text ? await page.text() : '';
    if (html.length === 0) return false;

    const body = JSON.stringify({ host, path, html });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac('sha256', config.staticPublishSecret)
      .update(`${timestamp}.${body}`)
      .digest('hex');

    const uploaded = await this.fetchImpl(target, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-lumio-signature': `sha256=${signature}`,
        'x-lumio-timestamp': String(timestamp),
      },
      body,
      signal: AbortSignal.timeout(timeout),
    });
    return uploaded.ok;
  }
}

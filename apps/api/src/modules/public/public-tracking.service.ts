import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  deviceFromUserAgent,
  normalizeTrackingPath,
  normalizeTrackingReferrer,
  type PageviewEdgeEvent,
  type PageviewInput,
} from '@lumio/shared';
import { PrismaService } from '../prisma/prisma.service';
import { resolveSiteByHost } from './resolve-site';

export interface TrackingContext {
  ip?: string | null;
  userAgent?: string | null;
  /** Coarse country from the CDN header (`cf-ipcountry`), when present. */
  country?: string | null;
}

/**
 * Rotating, non-identifying visitor key. A random per-browser id is preferred;
 * otherwise the IP and user agent are salted and hashed, and the day is mixed in
 * so the hash cannot be used to follow someone across days. The full IP is never
 * stored (docs/design/15-security.md 15.3).
 */
export const trackingSessionHash = (
  siteId: string,
  seed: string | undefined,
  context: TrackingContext,
  day: string,
  salt: string,
): string => {
  const basis = seed && seed.length > 0 ? `v:${seed}` : `c:${context.ip ?? ''}|${context.userAgent ?? ''}`;
  return createHash('sha256').update(`${salt}|${siteId}|${day}|${basis}`).digest('hex').slice(0, 32);
};

const hashSalt = (): string => process.env.ANALYTICS_HASH_SALT ?? 'lumio-analytics';

/**
 * Records page views for the site behind a public host (docs/design/11-data-model.md
 * `pageviews`). `pageviews` is partitioned and not modelled by Prisma, so rows are
 * inserted with raw SQL inside the site-scoped transaction; RLS checks the
 * `site_id` on the way in.
 *
 * The same service serves the browser beacon and the edge batch endpoint: an edge
 * delivery looks up the site once and inserts up to 100 rows in one transaction.
 */
@Injectable()
export class PublicTrackingService {
  constructor(private readonly db: PrismaService) {}

  async record(host: string, input: PageviewInput, context: TrackingContext = {}): Promise<void> {
    await this.recordMany(host, [input], context);
  }

  /** Inserts a batch and answers how many rows were accepted. */
  async recordMany(
    host: string,
    events: PageviewEdgeEvent[],
    context: TrackingContext = {},
  ): Promise<number> {
    if (events.length === 0) return 0;

    const site = await resolveSiteByHost(this.db, host);
    const day = new Date().toISOString().slice(0, 10);
    const salt = hashSalt();

    const rows = events.map((event) => {
      const eventContext: TrackingContext = {
        ip: context.ip ?? null,
        userAgent: event.userAgent ?? context.userAgent ?? null,
        country: event.country ?? context.country ?? null,
      };
      return {
        path: normalizeTrackingPath(event.path),
        referrer: normalizeTrackingReferrer(event.referrer) ?? null,
        country: eventContext.country?.trim().slice(0, 8) || null,
        device: deviceFromUserAgent(eventContext.userAgent),
        sessionHash: trackingSessionHash(site.id, event.visitorId, eventContext, day, salt),
      };
    });

    await this.db.forSite(site.id, async (tx) => {
      for (const row of rows) {
        await tx.$executeRaw`
          INSERT INTO "pageviews" ("site_id", "path", "referrer", "country", "device", "session_hash", "ts")
          VALUES (${site.id}::uuid, ${row.path}, ${row.referrer}, ${row.country}, ${row.device}, ${row.sessionHash}, now())
        `;
      }
    });

    return rows.length;
  }
}

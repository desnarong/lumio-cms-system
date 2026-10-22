/**
 * Publish jobs (docs/design/10-architecture.md 10.4). The API copies the draft
 * into `blocks_published` and then enqueues one job per affected page; the
 * worker consumes it and asks the renderer to rebuild the static HTML.
 *
 * The queue follows the shared contract in `common/job-queue.ts`: an in-process
 * driver by default, BullMQ when `QUEUE_DRIVER=bullmq` (see
 * `common/bullmq-queue.ts`).
 */

import { InMemoryJobQueue, type JobOf, type JobQueue } from '../../common/job-queue';

export const PUBLISH_QUEUE = 'lumio:publish-queue';

export type PublishJobKind = 'page' | 'site';

export interface PublishJobInput {
  siteId: string;
  kind: PublishJobKind;
  /** Hostname the renderer serves this site on; used as the cache key. */
  host: string | null;
  /** Paths that must be rebuilt, e.g. `/about` and `/sitemap.xml`. */
  paths: string[];
}

export type PublishJob = JobOf<PublishJobInput>;

export type PublishQueue = JobQueue<PublishJobInput>;

/**
 * Single-process queue. It is the default driver until Redis/BullMQ is wired
 * up, and it keeps the publish flow fully testable without infrastructure.
 */
export class InMemoryPublishQueue extends InMemoryJobQueue<PublishJobInput> {
  constructor() {
    super('pub');
  }
}
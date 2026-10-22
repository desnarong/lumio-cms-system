/**
 * Media jobs (docs/design/12-api.md 12.6 step 5). Confirming an upload enqueues
 * one job; the worker renders the WebP/AVIF ladder and flips the row to `ready`.
 *
 * Like the publish queue it follows `common/job-queue.ts`, so the in-process
 * driver used in development and tests can be replaced by BullMQ
 * (`QUEUE_DRIVER=bullmq`) without touching the API.
 */

import { InMemoryJobQueue, type JobOf, type JobQueue } from '../../common/job-queue';

export const MEDIA_QUEUE = 'lumio:media-queue';

export interface MediaJobInput {
  siteId: string;
  mediaId: string;
}

export type MediaJob = JobOf<MediaJobInput>;

export type MediaFailure = { job: MediaJob; reason: string };

export type MediaQueue = JobQueue<MediaJobInput>;

/** Single-process driver; the default until Redis/BullMQ is switched on. */
export class InMemoryMediaQueue extends InMemoryJobQueue<MediaJobInput> {
  constructor() {
    super('med');
  }
}
/**
 * Jobs that build a site's other languages (docs/design/17-i18n.md 17.1,
 * 04-ux.md 4.1 step 5). Creating the site itself stays synchronous: the pages of
 * the default language exist the moment the wizard ends, and this queue copies
 * them into every extra language plus translates the copy.
 *
 * The queue follows the shared contract in `common/job-queue.ts`: in-process by
 * default, BullMQ when `QUEUE_DRIVER=bullmq`.
 */

import { InMemoryJobQueue, type JobOf, type JobQueue } from '../../common/job-queue';

export const SITE_LOCALE_QUEUE = 'lumio:site-locale-queue';

export interface SiteLocaleJobInput {
  siteId: string;
  /** Languages to build; never includes the site's default language. */
  locales: string[];
  /** Whose name goes on the translated pages (owner who ran the wizard). */
  userId: string;
  /** Publish each translated page as soon as it exists. */
  publishNow: boolean;
}

export type SiteLocaleJob = JobOf<SiteLocaleJobInput>;

export type SiteLocaleQueue = JobQueue<SiteLocaleJobInput>;

/** In-process driver, used in development and by the tests. */
export class InMemorySiteLocaleQueue extends InMemoryJobQueue<SiteLocaleJobInput> {
  constructor() {
    super('loc');
  }
}

import { Inject, Injectable } from '@nestjs/common';
import { localePathFor, publicPathFor, type ContentType } from '@lumio/shared';
import { PrismaService } from '../prisma/prisma.service';
import { rootDomain } from '../public/host';
import { PUBLISH_QUEUE, type PublishJob, type PublishQueue } from './publish.queue';

const SITEMAP_PATH = '/sitemap.xml';

export interface EnqueuePageInput {
  siteId: string;
  type: ContentType;
  slug: string;
  /** Language of the page; omitted for the default language (docs/design/17-i18n.md). */
  locale?: string;
}

/**
 * Entry point for the publish pipeline. Services call this after their
 * transaction commits, so a job is only ever queued for durable data.
 */
@Injectable()
export class PublishService {
  constructor(
    @Inject(PUBLISH_QUEUE) private readonly queue: PublishQueue,
    private readonly db: PrismaService,
  ) {}

  async enqueuePage(input: EnqueuePageInput): Promise<PublishJob> {
    const host = await this.primaryHost(input.siteId);
    const basePath = publicPathFor(input.type, input.slug);

    // Clear both the default URL and the language-specific one: a translated page
    // is served from `/<locale>/...`, and the renderer caches each URL.
    const paths = new Set<string>([basePath, SITEMAP_PATH]);
    if (input.locale) {
      const defaultLocale = await this.defaultLocale(input.siteId);
      if (input.locale !== defaultLocale) {
        paths.add(localePathFor(input.type, input.slug, input.locale, defaultLocale));
      }
    }

    return this.queue.add({
      siteId: input.siteId,
      kind: 'page',
      host,
      paths: [...paths],
    });
  }

  async enqueueSite(siteId: string, paths: string[] = ['/', SITEMAP_PATH]): Promise<PublishJob> {
    const host = await this.primaryHost(siteId);
    return this.queue.add({ siteId, kind: 'site', host, paths });
  }

  /**
   * Hostname the renderer serves this site on: the verified primary domain when
   * there is one, otherwise the free `*.example.com` subdomain.
   */
  async primaryHost(siteId: string): Promise<string | null> {
    const domain = await this.db.forSite(siteId, (tx) =>
      tx.domain.findFirst({ where: { isPrimary: true }, select: { hostname: true } }),
    );
    if (domain) return domain.hostname;

    const site = await this.db.site.findUnique({
      where: { id: siteId },
      select: { subdomain: true },
    });
    return site ? `${site.subdomain}.${rootDomain()}` : null;
  }

  /** Default language of a site, used to decide whether a URL needs a prefix. */
  private async defaultLocale(siteId: string): Promise<string> {
    const site = await this.db.site.findUnique({
      where: { id: siteId },
      select: { localeDefault: true },
    });
    return site?.localeDefault ?? 'th';
  }
}

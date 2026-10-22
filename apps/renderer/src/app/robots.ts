import type { MetadataRoute } from 'next';
import { requestHost } from '../lib/request-host';
import { robotsPolicy } from '../lib/sitemap';

export default async function robots(): Promise<MetadataRoute.Robots> {
  return robotsPolicy(await requestHost());
}

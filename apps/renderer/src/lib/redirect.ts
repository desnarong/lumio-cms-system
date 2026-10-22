import { permanentRedirect, redirect } from 'next/navigation';
import type { PublicPage } from '@lumio/shared';

/**
 * Follows the redirect manager (docs/design/14-seo-performance.md 14.1). A 301
 * becomes a permanent redirect, anything else a temporary one.
 */
export const applyRedirect = (page: PublicPage): void => {
  if (!page.redirect) return;
  if (page.redirect.code === 301) permanentRedirect(page.redirect.to);
  redirect(page.redirect.to);
};

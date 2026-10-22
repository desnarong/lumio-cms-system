/**
 * Reports a visible 404 to the API so the SEO screen can suggest a redirect
 * (docs/design/14-seo-performance.md 14.1). Deliberately fire-and-forget: a
 * broken analytics path must never delay or fail the visitor's error page.
 */

import { apiBaseUrl } from './site-locales';

export interface NotFoundReportDeps {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export const reportNotFound = async (
  host: string,
  path: string,
  deps: NotFoundReportDeps = {},
): Promise<boolean> => {
  const baseUrl = deps.baseUrl ?? apiBaseUrl();
  if (baseUrl.length === 0) return false;

  try {
    const response = await (deps.fetchImpl ?? fetch)(
      `${baseUrl.replace(/\/+$/, '')}/api/v1/public/${encodeURIComponent(host)}/not-found`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path }),
        cache: 'no-store',
        signal: AbortSignal.timeout(deps.timeoutMs ?? 2_000),
      },
    );
    return response.ok;
  } catch {
    return false;
  }
};

import type {
  CreateSiteFromTemplateInput,
  SiteLocaleStatus,
  SiteSummary,
  TemplateSummary,
  WizardSiteResult,
} from '@lumio/shared';
import { translateNow } from '@lumio/ui';
import { ApiError } from '../editor/api.js';

/** Templates, the site list, and step 5's "create my site". */
export interface WizardApi {
  listTemplates(): Promise<TemplateSummary[]>;
  listSites(): Promise<SiteSummary[]>;
  createSite(input: CreateSiteFromTemplateInput): Promise<WizardSiteResult>;
  /** Progress of the background build of the site's other languages. */
  localeStatus(siteId: string): Promise<SiteLocaleStatus>;
}

interface Envelope<T> {
  data: T;
}

interface ErrorEnvelope {
  error?: string;
  message?: string;
}

export interface HttpWizardApiConfig {
  baseUrl: string;
  getAccessToken?: () => string | null;
  fetchImpl?: typeof fetch;
}

/**
 * Talks to `/api/v1/templates` and `/api/v1/sites`. Creating a site *is* wizard
 * step 5 on the server: it builds the sample pages, the menu and the
 * header/footer from the template in one go (docs/design/04-ux.md 4.1).
 */
export const createHttpWizardApi = ({
  baseUrl,
  getAccessToken,
  fetchImpl,
}: HttpWizardApiConfig): WizardApi => {
  const doFetch = fetchImpl ?? globalThis.fetch.bind(globalThis);

  const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const token = getAccessToken?.() ?? null;
    const response = await doFetch(`${baseUrl}/api/v1${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });

    const payload = (await response.json().catch(() => null)) as
      | Envelope<T>
      | ErrorEnvelope
      | null;

    if (!response.ok) {
      const error = payload as ErrorEnvelope | null;
      throw new ApiError(
        error?.error ?? 'internal_error',
        error?.message ?? translateNow('api.networkError'),
        response.status,
      );
    }

    return (payload as Envelope<T>).data;
  };

  return {
    listTemplates: () => request<TemplateSummary[]>('/templates'),
    listSites: () => request<SiteSummary[]>('/sites'),
    createSite: (input) =>
      request<WizardSiteResult>('/sites', { method: 'POST', body: JSON.stringify(input) }),
    localeStatus: (siteId) => request<SiteLocaleStatus>('/sites/' + siteId + '/locales'),
  };
};
